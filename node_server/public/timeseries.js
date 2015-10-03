(function() {

    "use strict";

    var URL = "http://taivoapp.mybluemix.net/recent/?n=1";
    var INTERVAL = 1000;

    D3ts.defaults = {};

    D3ts.defaults.width = 500;
    D3ts.defaults.height = 60;

    D3ts.defaults.margin = {
        top: 0,
        right: 0,
        bottom: 0,
        left: 30
    };

    D3ts.defaults.domain = {
        x: [0, 20],
        y: [0, 30]
    };

    D3ts.defaults.range = {
        x: [0, D3ts.defaults.width],
        y: [D3ts.defaults.height, 0]
    };

    function D3ts(options) {
        var o, x, y;
        
        this.svg = null;
        this.options = o = JSUS.merge(D3ts.defaults, options);
        this.n = o.domain.x[1];        
        this.color = o.color || null;
        this.id = o.id;
        this.data = [[0]];

        this.margin = o.margin;

        this.width = o.width - this.margin.left - this.margin.right;
        this.height = o.height - this.margin.top - this.margin.bottom;

        // Identity function.
        this.x = x = d3.scale.linear()
            .domain(o.domain.x)
            .range(o.range.x);

        this.y = y = d3.scale.linear()
            .domain(o.domain.y)
            .range(o.range.y);

        // line generator
        this.line = d3.svg.line()
            .x(function(d, i) { return x(i); })
            .y(function(d, i) { return y(d); });
    }


    D3ts.prototype.append = function(root) {
        root = root || document.body;
        this.root = root;
        this.svg = d3.select(root).append("svg");
        if (this.id) this.svg.id = this.id;
        return root;
    };

    D3ts.prototype.init = function(options) {
        var x = this.x,
        y = this.y,
        height = this.height,
        width = this.width,
        margin = this.margin;


        // Create the SVG and place it in the middle
        this.svg.attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform",
                  "translate(" + margin.left + "," + margin.top + ")");


        // Line does not go out the axis
        this.svg.append("defs").append("clipPath")
            .attr("id", "clip")
            .append("rect")
            .attr("width", width)
            .attr("height", height);

        // X axis
        this.svg.append("g")
            .attr("class", "x axis")
            .attr("transform", "translate(0," + height + ")")
            .call(d3.svg.axis().scale(x).orient("bottom"));

        // Y axis
        this.svg.append("g")
            .attr("class", "y axis")
            .call(d3.svg.axis().scale(y).orient("left"));

        this.path = this.svg.append("g")
            .attr("clip-path", "url(#clip)")
            // .attr("stroke","red")
            .append("path")
            .data([this.data])
            .attr("class", "line")
            .attr("d", this.line);

        if (this.color) {
            this.path.attr("fill", this.color);
        }
    };

    D3ts.prototype.update = function(value) {
        var x;

        this.alreadyInit = this.alreadyInit || false;
        if (!this.alreadyInit) {
            this.init();
            this.alreadyInit = true;
        }

        x = this.x;

        // push a new data point onto the back
        this.data.push(value);
        this.data.push(0);

        // redraw the line, and slide it to the left
        this.path
            .attr("d", this.line)
            .attr("transform", null);

        
        // pop the old data point off the front
        if (this.data.length > this.n) {

            this.path
                .transition()
                .duration(500)
                .ease("linear")
                .attr("transform", "translate(" + x(-1) + ")");

            this.data.shift();
            this.data[0] = 0;
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
    var lightYRange = 1600;
    var noiseYRange = 125;
    var motionYRange = 1;

    var d3tsTemp = new D3ts({
        domain: { x: [0, 20], y: [10, tempYRange] },
        color: "red"
    });
    var d3tsHum = new D3ts({
        domain: { x: [0, 20], y: [0, humYRange] }
        color: "blue"
    });
    var d3tsLight = new D3ts({
        domain: { x: [0, 20], y: [0, lightYRange] } 
        color: "yellow"
    });
    var d3tsNoise = new D3ts({
        domain: { x: [0, 20], y: [0, noiseYRange] } 
        color: "green"
    });
    var d3tsMotion = new D3ts({
        domain: { x: [0, 20], y: [-1, motionYRange] }
        color: "purple"
    });

    d3tsTemp.append(document.getElementById("temperature"));
    d3tsHum.append(document.getElementById("humidity"));
    d3tsLight.append(document.getElementById("light"));
    d3tsNoise.append(document.getElementById("noise"));
    d3tsMotion.append(document.getElementById("motion"));
    
    window.aa = setInterval(function(){
        
        d3.json(URL, function(json) {
            var temp, hum, light, noise, motion;

            json = json[0];
            temp = (2*json.temperature)/(9*4.095) - 61.1
            light = (1.5094*json.light/4.095) + 37.515;
            hum = (0.1906*json.humidity/4.095) - 40.2;
            motion = json.motion/(4.095*500) - 1; 
            noise = (16.801*Math.log(json.sound)) + 9.872;

            console.log(temp);
            console.log(light);
            console.log(hum);
            console.log(motion);
            console.log(noise);

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
