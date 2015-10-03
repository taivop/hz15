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

// Save datapoint to database
var record_datapoint = function (req, res) {
    pg.connect(psql, function (err, client, done) {
        if (err) {
            return console.error('Error requesting client', err);
        }

        var rq = req.query;
        client.query('insert into roomdata(room, light, temperature, humidity, motion, sound) values($1, $2, $3, $4, $5, $6)',
            [rq.room, rq.light, rq.temperature, rq.humidity, rq.motion, rq.sound],
            function (err, result) {
                done();

                if (err) {
                    return console.error('Error inserting values', err);
                }

                res.writeHead(200, {'Content-Type': 'text/html'});
                res.end("Insertion successful.");

            });

        done();
    });
}

// Return all datapoints for listed rooms
var return_room = function(req, res) {
    pg.connect(psql, function (err, client, done) {
        if (err) {
            return console.error('Error requesting client', err);
        }

        var rq = req.query;


        if(typeof rq.rooms != "undefined") {
            var room_list_string = rq.rooms.split(",").map(function(d) { return "'" + d + "'"; }).join(",");

            client.query("select * from roomdata where room in (" + room_list_string + ");",
                [],
                function (err, result) {
                    if (err) {
                        done();
                        return console.error('Error retrieving values', err);
                    }

                    res.writeHead(200, {'Content-Type': 'application/json'});
                    res.write(JSON.stringify(result.rows));
                    res.end();
                });
        }
        else {
            room_list_string = ""

            res.writeHead(200, {'Content-Type': 'application/json'});
            res.write(JSON.stringify([]));
            res.end();
        }

        done();

    });
}

// Return latest datapoint for each room
var return_latest = function(req, res) {

}

// Return last 20 datapoints added to the database
var return_last_n_datapoints = function(req, res) {
    pg.connect(psql, function (err, client, done) {
        if (err) {
            return console.error('Error requesting client', err);
        }

        var rq = req.query;

        var n = rq.n || 20;

        client.query("select * from roomdata order by ts desc limit $1;",
            [n],
            function (err, result) {
                done();
                if (err) {
                    return console.error('Error retrieving values', err);
                }

                res.writeHead(200, {'Content-Type': 'application/json'});
                res.write(JSON.stringify(result.rows));
                res.end();
            });

        done();
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

app.get('/recent', function (req, res) {
   return_last_n_datapoints(req, res);
});

app.get('/recent', function (req, res) {
   return_last_n_datapoints(req, res);
});

app.get('/insert', function (req, res) {
    record_datapoint(req, res);
});

app.get('/room', function (req, res) {
    return_room(req, res);
});

app.use('/', express.static(__dirname + '/public'));

console.log("Listening on " + host + ":" + port);
app.listen(port, host);