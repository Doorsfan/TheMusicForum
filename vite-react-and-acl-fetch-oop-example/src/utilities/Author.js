import FetchHelper from './FetchHelper';

export default class Author extends FetchHelper {
  static restEntity = 'authors';

  get firstName()
  {
    return this.name.split(' ')[0];
  }

  get lastName()
  {
    return this.name.split(' ').slice(-1)[0];
  }

  sayHi()
  {
    return 'Hi I am ' + this.firstName + '!';
  }
}