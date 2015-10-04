(function() {

    "use strict";

    //var URL = "http://taivoapp.mybluemix.net/recent/?n=1";
    var URL = "/recent/?n=1";

    var INTERVAL = 100;

    D3ts.defaults = {};

    D3ts.defaults.width = 500;
    D3ts.defaults.height = 60;

    D3ts.defaults.margin = {
        top: 0,
        right: 0,
        bottom: 0,
        left: 40
    };

    D3ts.defaults.domain = {
        x: [0, 20],
        y: [0, 30]
    };

    D3ts.defaults.range = {
        x: [-(D3ts.defaults.width), 0],
        y: [D3ts.defaults.height, 0]
    };

    function D3ts(options) {
        var o, x, y;
        
        this.svg = null;
        this.options = o = JSUS.merge(D3ts.defaults, options);
        this.n = o.domain.x[1];        
        this.color = o.color || null;
        this.id = o.id;
        this.data = [];

        this.margin = o.margin;

        this.width = o.width - this.margin.left - this.margin.right;
        this.height = o.height - this.margin.top - this.margin.bottom;

        // Identity function.
        this.x = x = d3.scale.linear()
            .domain(o.domain.x)
            .range(o.range.x.reverse());

        this.y = y = d3.scale.linear()
            .domain(o.domain.y)
            .range(o.range.y);

        // Line generator.
        this.line = d3.svg.line()
            .x(function(d, i) { return x(i); })
            .y(function(d, i) { return y(d); });
    }


    D3ts.prototype.append = function(root) {
        root = root || document.body;
        this.root = root;
        this.svg = d3.select(root).append("svg").style("width", 500).style("height", 60);
        if (this.id) this.svg.id = this.id;
        return root;
    };

    D3ts.prototype.init = function(options) {
        var x = this.x,
        y = this.y,
        height = this.height,
        width = this.width,
        margin = this.margin;


        // Create the SVG and place it in the middle.
        this.svg.attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform",
                  "translate(" + margin.left + "," + margin.top + ")");


        // Line does not go out the axis.
        this.svg.append("defs").append("clipPath")
            .attr("id", "clip")
            .append("rect")
            .attr("width", width)
            .attr("height", height);

        // X axis.
        this.xAxis = this.svg.append("g")
            .attr("class", "x axis")
            .attr("transform", "translate(0," + height + ")")
            .call(d3.svg.axis()
                  .scale(x)
                  .orient("bottom"));
                  //.tickFormat(""));

        // Y axis.
        this.svg.append("g")
            .attr("class", "y axis")
            .call(d3.svg.axis()
                  .scale(y)
                  .orient("left")
                  .ticks(3));

        this.path = this.svg.append("g")
            .attr("clip-path", "url(#clip)")
            .attr("stroke",this.color)
            .attr("stroke-width", "8px")
            .append("path")
            .data([this.data])
            .attr("class", "line")
            .attr("d", this.line)
            .attr("fill", "none");

    };

    D3ts.prototype.update = function(value) {

        var x, that;

        this.alreadyInit = this.alreadyInit || false;
        if (!this.alreadyInit) {
            this.init();
            this.alreadyInit = true;
        }

        x = this.x;

        // Add a new data point and zero value
        // to create the mountain effect.
        this.data.unshift(value);
        //this.data.push(0);

        // Redraw the line and slides.
        this.path
            .attr("d", this.line)
            .attr("transform", null);

        
        // Remove excess data points.
        if (this.data.length > this.n) {

            this.path
                .transition()
                .duration(500)
                .ease("linear")
                .attr("transform", "translate(" + this.x(21) + ")");

            this.data.pop();
            //this.data[0] = 0;
        }
    };

    window.D3ts = D3ts;

    D3ts.defaults.domain = {
        x: [0, 20],
        y: [0, 30]
    };

    D3ts.defaults.range = {
        x: [0, D3ts.defaults.width],
        y: [D3ts.defaults.height, 0]
    };

    var tempYRange = 30;
    var humYRange = 100;
    var lightYRange = 100;
    var noiseYRange = 125;
    var motionYRange = 1;

    var d3tsTemp = new D3ts({
        domain: { x: [0, 20], y: [10, tempYRange] },
        color: "red"
    });
    var d3tsHum = new D3ts({
        domain: { x: [0, 20], y: [0, humYRange] },
        color: "blue"
    });
    var d3tsLight = new D3ts({
        domain: { x: [0, 20], y: [0, lightYRange] },
        color: "brown"
    });
    var d3tsNoise = new D3ts({
        domain: { x: [0, 20], y: [60, noiseYRange] },
        color: "green"
    });
    var d3tsMotion = new D3ts({
        domain: { x: [0, 20], y: [-1, motionYRange] },
        color: "purple"
    });

    d3tsTemp.append(document.getElementById("temperature"));
    d3tsHum.append(document.getElementById("humidity"));
    d3tsLight.append(document.getElementById("light"));
    d3tsNoise.append(document.getElementById("noise"));
    d3tsMotion.append(document.getElementById("motion"));
    
    window.d3Interval = setInterval(function() {
        
        d3.json(URL, function(json) {
            var temp, hum, light, noise, motion;

            json = json[0];
            temp = convert_temp(+json.temperature);
            light = convert_light(+json.light);
            hum = convert_humid(+json.humidity);
            motion = convert_motion(+json.motion);
            noise = convert_noise(+json.sound);

            var format_temp = d3.format(".1f");
            var format_humid = d3.format(".0f");
            var format_noise = d3.format(".0f");
            var format_light = d3.format(".0f");
            var format_motion = d3.format(".2f");

            d3.select("#val_temp").text(format_temp(temp));
            d3.select("#val_light").text(format_light(light));
            d3.select("#val_humid").text(format_humid(hum));
            d3.select("#val_motion").text(format_motion(motion));
            d3.select("#val_noise").text(format_noise(noise));

            console.log(temp + " | " + hum + " | " + light + " | " + noise + " | " + motion);

            if (isNaN(temp) || temp == Infinity || temp == -Infinity) {
                temp = 0;
            }
            if (isNaN(light) || light == Infinity || light == -Infinity) {
                light = 0;
            }
            if (isNaN(hum) || hum == Infinity || hum == -Infinity) {
                hum = 0;
            }
            if (isNaN(motion) || motion == Infinity || motion == -Infinity) {
                motion = 0;
            }
            if (isNaN(noise) || noise == Infinity || noise == -Infinity) {
                noise = 0;
            }

            d3tsTemp.update([[temp]]);
            d3tsHum.update([[hum]]);
            d3tsLight.update([[light]]);
            d3tsNoise.update([[noise]]);
            d3tsMotion.update([[motion]]);

        });
    }, INTERVAL);

})();
