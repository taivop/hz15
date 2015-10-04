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

// Return equal timestep data for the specified range for the specified room
var return_room_new = function(req, res) {
    pg.connect(psql, function (err, client, done) {
        if (err) {
            return console.error('Error requesting client', err);
        }

        var rq = req.query;
        
        function formatDate(date) {
            return date.getFullYear() + '-' + (date.getMonth()+1) + "-" + date.getDate() + " " + date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds()
        }
        
        if (typeof rq.room != "undefined" || typeof rq.fromdate == "undefined" || typeof rq.todate == "undefined") {
            rq.fromdate = new Date(rq.fromdate);
            rq.todate = new Date(rq.todate);
        
            var room_string = "'" + rq.room + "'";
            var fromdate_string = "'" + formatDate(rq.fromdate) + "'";
            var todate_string = "'" + formatDate(rq.todate) + "'";
            client.query("select * from roomdata where room = " + room_string + " and ts between " + fromdate_string + " and " + todate_string + " order by ts asc;",
                [],
                function (err, r) {
                    if (err) {
                        done();
                        return console.error('Error retrieving values', err);
                    }
                    
                    var output = new Array();
                    var numelements = 299;
                    var deltatime = (rq.todate.getTime() - rq.fromdate.getTime())/numelements;
                    var currtime = rq.fromdate.getTime();
                    
                    var j = 0;
                    
                    for (i = 0; i < numelements; i++) {
                        while (new Date(r.rows[j+1].ts).getTime() < currtime) {
                            if (j+1 == r.rows.length - 1) {
                                break;
                            }
                            j++;
                        }
                        
                        var no = {};
                        no.room = rq.room;
                        no.ts = formatDate(new Date(currtime));
                        var k = (currtime - new Date(r.rows[j].ts).getTime())/(new Date(r.rows[j+1].ts).getTime() - new Date(r.rows[j].ts).getTime());
                        no.light = r.rows[j].light + k*(r.rows[j+1].light - r.rows[j+1].light);
                        no.temperature = r.rows[j].temperature + k*(r.rows[j+1].temperature - r.rows[j+1].temperature);
                        no.humidity = r.rows[j].humidity + k*(r.rows[j+1].humidity - r.rows[j+1].humidity);
                        no.motion = r.rows[j].motion + k*(r.rows[j+1].motion - r.rows[j+1].motion);
                        no.sound = r.rows[j].sound + k*(r.rows[j+1].sound - r.rows[j+1].sound);
                        output.push(no);
                        
                        currtime += deltatime;
                    }
                    
                    res.writeHead(200, {'Content-Type': 'application/json'});
                    res.write(JSON.stringify(output));
                    res.end();
                });
        }
        else {
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

app.get('/room_new', function (req, res) {
    return_room_new(req, res);
});

app.use('/', express.static(__dirname + '/public'));

console.log("Listening on " + host + ":" + port);
app.listen(port, host);