'use strict';

const pg = require('pg');
const fs = require('fs');
const express = require('express');
const bodyParser = require('body-parser');
const PORT = process.env.PORT || 3000;
const app = express();
const conString = `postgres://postgres:${process.env.PG_PASSWORD}@localhost:5432/kilovolt`;
// DONE: Don't forget to set your own conString
// estimate 5 min, actual 5 min
const client = new pg.Client(conString);
client.connect();
client.on('error', function(error) {
  console.error(error);
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static('./public'));

app.get('/new', function(request, response) {
  response.sendFile('new.html', {root: './public'});
});

app.get('/articles', function(request, response) {
  // REVIEW: This query will join the data together from our tables and send it back to the client.
  // DONE: Write a SQL query which joins all data from articles and authors tables on the author_id value of each
  // estimate: 10 in, actual 5 min
  client.query(`SELECT * FROM articles
    JOIN authors
    ON articles.author_id = authors.author_id;`)
  .then(function(result) {
    response.send(result.rows);
  })
  .catch(function(err) {
    console.error(err)
  });
});

app.post('/articles', function(request, response) {
  client.query(
    // DONE: Write a SQL query to insert a new author, ON CONFLICT DO NOTHING
    // estimate 5 min actual 2 min
    `INSERT INTO authors (author, "authorUrl")
    VALUES ($1 and $2) ON CONFLICT DO NOTHING;`,
    // DONE: Add the author and "authorUrl" as data for the SQL query
    // estimate 10 min, actual 5 min
    [
      request.body.author,
      request.body.authorUrl
    ],
    function(err) {
      if (err) console.error(err)
      queryTwo() // This is our second query, to be executed when this first query is complete.
    }
  )

  function queryTwo() {
    client.query(
      // DONE: Write a SQL query to retrieve the author_id from the authors table for the new article
      // estimate 5 min, actual2 min
      `SELECT (author_id FROM authors WHERE author_id = $1, ;`,
      // DONE: Add the author name as data for the SQL query
      [
        request.body.author
      ],
      function(err, result) {
        if (err) console.error(err)
        queryThree(result.rows[0].author_id) // This is our third query, to be executed when the second is complete. We are also passing the author_id into our third query
      }
    )
  }

  function queryThree(author_id) {
    client.query(
      `INSERT INTO articles (title, author, "authorUrl", category, "publishedOn", body)
       WHERE title=$1, author=$2, "authorUrl"=$3, category=$4, "publishedOn"=$5, body=$6
       author_id=$7;`, // TODO: MAYBE DONE Write a SQL query to insert the new article using the author_id from our previous query
      [ author_id.body.title,
        author_id.body.author,
        author_id.body.authorUrl,
        author_id.body.category,
        author_id.body.publishedOn,
        author_id.body.body,
        author_id.body.id], // TODO: Add the data from our new article, including the author_id, as data for the SQL query.
      function(err) {
        if (err) console.error(err);
        response.send('insert complete');
      }
    );
  }

});

app.put('/articles/:id', function(request, response) {
  // TODO: Write a SQL query to update an author record. Remember that our articles now have
  // an author_id property, so we can reference it from the request.body.
  // TODO: Add the required values from the request as data for the SQL query to interpolate
  client.query(
    ``,
    []
  )
  .then(function() {
    // TODO: Write a SQL query to update an article record. Keep in mind that article records
    // now have an author_id, in addition to title, category, publishedOn, and body.
    // TODO: Add the required values from the request as data for the SQL query to interpolate
    client.query(
      ``,
      []
    )
  })
  .then(function() {
    response.send('Update complete');
  })
  .catch(function(err) {
    console.error(err);
  })
});

app.delete('/articles/:id', function(request, response) {
  client.query(
    `DELETE FROM articles WHERE article_id=$1;`,
    [request.params.id]
  )
  .then(function() {
    response.send('Delete complete');
  })
  .catch(function(err) {
    console.error(err)
  });
});

app.delete('/articles', function(request, response) {
  client.query('DELETE FROM articles')
  .then(function() {
    response.send('Delete complete');
  })
  .catch(function(err) {
    console.error(err)
  });
});

loadDB();

app.listen(PORT, function() {
  console.log(`Server started on port ${PORT}!`);
});


//////// ** DATABASE LOADERS ** ////////
////////////////////////////////////////
// REVIEW: This helper function will load authors into the DB if the DB is empty
function loadAuthors() {
  fs.readFile('./public/data/hackerIpsum.json', function(err, fd) {
    JSON.parse(fd.toString()).forEach(function(ele) {
      client.query(
        'INSERT INTO authors(author, "authorUrl") VALUES($1, $2) ON CONFLICT DO NOTHING',
        [ele.author, ele.authorUrl]
      )
    })
  })
}

// REVIEW: This helper function will load articles into the DB if the DB is empty
function loadArticles() {
  client.query('SELECT COUNT(*) FROM articles')
  .then(function(result) {
    if(!parseInt(result.rows[0].count)) {
      fs.readFile('./public/data/hackerIpsum.json', function(err, fd) {
        JSON.parse(fd.toString()).forEach(function(ele) {
          client.query(`
            INSERT INTO
            articles(author_id, title, category, "publishedOn", body)
            SELECT author_id, $1, $2, $3, $4
            FROM authors
            WHERE author=$5;
          `,
            [ele.title, ele.category, ele.publishedOn, ele.body, ele.author]
          )
        })
      })
    }
  })
}

// REVIEW: Below are two queries, wrapped in the loadDB() function,
// which create separate tables in our DB, and create a
// relationship between the authors and articles tables.
// THEN they load their respective data from our JSON file.
function loadDB() {
  client.query(`
    CREATE TABLE IF NOT EXISTS
    authors (
      author_id SERIAL PRIMARY KEY,
      author VARCHAR(255) UNIQUE NOT NULL,
      "authorUrl" VARCHAR (255)
    );`
  )
  .then(function(data) {
    loadAuthors(data);
  })
  .catch(function(err) {
    console.error(err)
  });

  client.query(`
    CREATE TABLE IF NOT EXISTS
    articles (
      article_id SERIAL PRIMARY KEY,
      author_id INTEGER NOT NULL REFERENCES authors(author_id),
      title VARCHAR(255) NOT NULL,
      category VARCHAR(20),
      "publishedOn" DATE,
      body TEXT NOT NULL
    );`
  )
  .then(function(data) {
    loadArticles(data);
  })
  .catch(function(err) {
    console.error(err)
  });
}
