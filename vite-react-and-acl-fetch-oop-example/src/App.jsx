import { useState, useEffect } from 'react';

// a subclass to FetchHelper
import Author from './utilities/Author';

// a "lazy"/automatically created subclass to FetchHelper
import { factory } from './utilities/FetchHelper';
const { Book, Order } = factory;



export default function App() {
  const [persons, setPersons] = useState([]);

  // Run this when our component mounts (we can see it on screen)
  useEffect(() => {
    (async () => {

      // the lazily instantiated classes works too
      console.log(await Book.find());
      console.log(await Order.find());

      // create a new author
      let mickey = new Author({
        name: 'Mickey Mouse ' + Math.random(),
        description: 'A genius at work!'
      });
      await mickey.save();

      // fetch one author
      let deni = await Author.findOne(1);
      console.log(deni);

      // since we have defined getters and methods in 
      // the Author class, authors have som built in logic:
      console.log(deni.firstName);
      console.log(deni.lastName);
      console.log(deni.sayHi());

      // change deni
      deni.description = ' Deni is the best ' + ['author', 'genius', 'hack'][Math.floor(Math.random() * 3)] + '.';
      await deni.save();

      // We can try to delete Deni
      // (but in this case there is 
      // a foreign key constraint so it won't work)
      await deni.delete();

      // Fetch all persons from backend
      setPersons(await Author.find());

      // We can delete Mickey Mouse that was just created
      await mickey.delete();

    })();
  }, []);

  return (
    <main>
      {persons.map(({ id, name, description }) =>
        <div className="person" key={id} onClick={() => alert(name)}>
          <h3>{name}</h3>
          <p>{description}</p>
        </div>
      )}
    </main>
  );
}