var port = (process.env.VCAP_APP_PORT || 3000),
    host = (process.env.VCAP_APP_HOST || 'localhost'),
    pg = require('pg.js'),
    express = require('express'),
    app = express(),
    psql;

if (process.env.VCAP_SERVICES) {
  var env = JSON.parse(process.env.VCAP_SERVICES);
  psql = env['postgresql-9.1'][0].credentials;
  // The Postgresql service returns the database name in the
  "name"
  // property but the pg.js Node.js module expects it to be in
  the
  // "database" property.
  psql.database = psql.name;
} else {
  // Specify local Postgresql connection properties here.
  psql = {
    database: "postgres",
    host: "localhost",
    port: 5432,
    user: "",
    password: "",
    ssl: false
  };
}

// Add the visit to the database and display the number of visits for the
// requesting ip address.
    var record_visit = function(req, res) {
      /* Connect to the DB and auth */
      pg.connect(psql, function(err, client, done) {
        if (err) {
          return console.error('Error requesting client', err);
        }

        client.query('insert into ips(ip, ts) values($1, $2)',
            [req.connection.remoteAddress, new Date()],
            function(err, result) {
              if (err) {
                done();
                return console.error('Error inserting ip', err);
              }

              client.query('select count(ip) as count from ips where ip=$1',
                  [req.connection.remoteAddress], function(err,
                                                           result) {
                done();
                if (err) {
                  return console.error('Error querying count',
                      err);
                }
                res.writeHead(200, {'Content-Type': 'text/html'});
                res.end("You have visited " + result.rows[0].count
                    + " times");
              });
            });
      });
    };

// On startup, drop the table if it exists then create it.
pg.connect(psql, function(err, client, done) {
  if (err) {
    return console.error('Error requesting client', err);
  }

  client.query('drop table if exists ips', function(err, result)
  {
    if (err) {
      done();
      return console.error('Error dropping table ips', err);
    }

    client.query('create table ips(id serial, ip varchar(40), ts date)',
    function (err, result) {
      done();
      if (err) {
        return console.error('Error creating table ips',
            err);
      }
    });
  });
});

app.get('/', function(req, res) {
  record_visit(req, res);
});

console.log("Listening on " + host + ":" + port);
app.listen(port, host);