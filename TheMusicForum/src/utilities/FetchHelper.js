// A base class for sub classes
// where each sub class corresponds to an entity

import { createFactory } from "react/cjs/react.production.min";

// in my REST-api/database
export default class FetchHelper {

  static async find() {
    // refine with limit, offset? later
    return (await (await fetch(`/api/${this.restEntity}`)).json())
      .map(x => new this(x));
  }

  static async findOne(parameter) {
    return new this(await (await fetch(`/api/${this.restEntity}/${parameter}`)).json());
  }

  constructor(props) {
    // Props = all properties for the object as an object
    // copy to this (the object being created)
    Object.assign(this, props);
  }

  async save() {
    let method = this.id ? 'PUT' : 'POST';
    let result = await (await fetch(`/api/${this.constructor.restEntity}${method === 'PUT' ? '/' + this.id : ''}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(this)
    })).json();
    // In this particular REST-api lastInsertRowid is returned
    // on posts and is the id of the newly created item
    if (method === 'POST' && result.lastInsertRowid) {
      this.id = result.lastInsertRowid;
    }
    // in this particular rest api the property _errror
    // signals that things have gone wrong
    if (result._error) {
      throw (new Error(result));
    }
  }

  async delete() {
    if (!this.id) { return { error: 'No id, can not delete' } };
    return await (await fetch(`/api/${this.constructor.restEntity}/${this.id}`, {
      method: 'DELETE'
    }));
  }

}

// If we are to lazy to create sub classes
// we can let a factory do the work
// (but then they won't have any special methods/getters etc)
export const factory = new Proxy({}, {
  // when we ask for a property from the proxy object
  // we expect that property name to be the name of the
  // class we shall instantiate lazy
  // we then create a function dynamically that in turn
  // creates a sub class to FetchHelper
  get(object, property) {
    let func = new Function('baseClass', `
      return class ${property} extends baseClass {
        static restEntity = '${property.toLowerCase() + 's'}'
      }
    `);
    return func(FetchHelper);
  }
});