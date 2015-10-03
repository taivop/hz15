var port = (process.env.VCAP_APP_PORT || 3000),
    host = (process.env.VCAP_APP_HOST || 'localhost'),
    pg = require('pg.js'),
    express = require('express'),
    app = express(),
    psql;

if (process.env.VCAP_SERVICES) {
    var env = JSON.parse(process.env.VCAP_SERVICES);
    psql = env['postgresql-9.1'][0].credentials;
    // The Postgresql service returns the database name in the "name"
    // property but the pg.js Node.js module expects it to be in the
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
var record_visit = function (req, res) {
    /* Connect to the DB and auth */
    pg.connect(psql, function (err, client, done) {
        if (err) {
            return console.error('Error requesting client', err);
        }

        client.query('insert into ips(ip, ts) values($1, $2)',
            [req.connection.remoteAddress, new Date()],
            function (err, result) {
                if (err) {
                    done();
                    return console.error('Error inserting ip', err);
                }

                client.query('select count(ip) as count from ips where ip=$1',
                    [req.connection.remoteAddress], function (err, result) {
                        done();
                        if (err) {
                            return console.error('Error querying count', err);
                        }
                        res.writeHead(200, {'Content-Type': 'text/html'});
                        res.end("You have visited " + result.rows[0].count
                            + " times");
                    });
            });
    });
};

var record_datapoint = function (req, res) {
    pg.connect(psql, function (err, client, done) {
        if (err) {
            return console.error('Error requesting client', err);
        }

        var rq = req.query;
        client.query('insert into roomdata(room, light, temperature, humidity, motion, sound) values($1, $2, $3, $4, $5, $6)',
            [rq.room, rq.light, rq.temperature, rq.humidity, rq.motion, rq.sound],
            function (err, result) {
                if (err) {
                    done();
                    return console.error('Error inserting values', err);
                }

                res.writeHead(200, {'Content-Type': 'text/html'});
                res.end("Insertion successful.");

            });
    });
}

var return_room = function(req, res) {
    pg.connect(psql, function (err, client, done) {
        if (err) {
            return console.error('Error requesting client', err);
        }

        var rq = req.query;
        client.query("select * from roomdata where room=$1",
            [rq.room],
            function (err, result) {
                if (err) {
                    done();
                    return console.error('Error retrieving values', err);
                }

                res.writeHead(200, {'Content-Type': 'text/html'});
                res.write(JSON.stringify(result.rows));
                res.end();
            });
    });
}

// On startup, create the table if doesn't exist
pg.connect(psql, function (err, client, done) {
    if (err) {
        return console.error('Error requesting client', err);
    }

        client.query('create table if not exists roomdata(id serial, room varchar(30), ts timestamp default current_timestamp, light real, temperature real, humidity real, motion real, sound real)',
            function (err, result) {
                done();
                if (err) {
                    return console.error('Error creating table roomdata', err);
                }
            });
    });

app.get('/', function (req, res) {
   // record_visit(req, res);
});

app.get('/insert', function (req, res) {
    record_datapoint(req, res);
});

app.get('/floor', function (req, res) {
    //return_all_rooms(req, res);
});

app.get('/room', function (req, res) {
    return_room(req, res);
});

console.log("Listening on " + host + ":" + port);
app.listen(port, host);