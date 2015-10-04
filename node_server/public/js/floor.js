width = 800;
height = 500;

shape = 0;

scale_factor = 10;

margin = {
    top: 20,
    right: 20,
    bottom: 20,
    left: 20
}

format_temp = d3.format(".1f");
format_humid = d3.format(".0f");

x = d3.scale.linear()
    .domain([0, 35])
    .range([margin.left, width-margin.right])

y = d3.scale.linear()
    .domain([0, 30])
    .range([margin.top, height-margin.bottom])

d3.json("data/floor_layout.json", function(floor_layout) {

    svg = d3.select("svg")
        .attr("width", width)
        .attr("height", height);


    var room_rects = svg.selectAll("g")
        .data(floor_layout.rooms)
        .enter().append("g")
        .attr("transform", function(d) { return "translate(" + x(d.x1) + "," + y(d.y1) + ")"; });

    room_rects.append("rect")
        .attr("class", function(d) {
            if(d.name == "Suite")
                return "room_rect suite";
            else
                return "room_rect";
        })
        .attr("width", function(d) {return x(d.x2) - x(d.x1)})
        .attr("height", function(d) {return y(d.y2) - y(d.y1); })
        .attr("fill", function(d) {return d.fillcolor;});

    room_rects.append("text")
        .attr("class", "room_name")
        .attr("x", function(d) { return 0.5 * (x(d.x2) - x(d.x1)); })
        .attr("y", function(d) {return 0.5 * (y(d.y2) - y(d.y1)); })
        .attr("dy", ".35em")
        .attr("text-anchor", "middle")
        .text(function(d) { return d.name; });

    room_rects.selectAll("rect")
        .on("mouseover", function(d) {
            console.log("hovering on " + d.name)
        })

    room_rects.select(".suite")
        .on("mousedown", function() {
            window.open("suite.html","_self");
        })


    var measurements_text = room_rects.append("text")
        .attr("class", "measurements")
        .attr("x", function(d) { return 0.5 * (x(d.x2) - x(d.x1)); })
        .attr("y", y(0))
        .attr("text-anchor", "middle")

    measurements_text.append("tspan")
        .attr("class", "m_temp")
        .text("")
    measurements_text.append("tspan")
        .attr("class", "m_humid")
        .attr("dy", 15)
        .attr("x", function(d) { return 0.5 * (x(d.x2) - x(d.x1)); })
        .text("")

    updateSVG(generateMeasurementArray(6));

    /*<text y="10">
     <tspan x="10">tspan line 1</tspan>
     <tspan x="10" dy="15">tspan line 2</tspan>
     <tspan x="10" dy="15">tspan line 3</tspan>
     </text>*/

})

generateMeasurementArray = function(n) {
    var arr = [];
    for(i=0; i<n; i++) {
        arr.push(generateMeasurement(i));
    }

    return arr;
}

generateMeasurement = function(i) {
    return {
        temperature: 20 + (i % 3) * 0.25 - (i % 2) * 0.5 + 0.06 * Math.random(),
        humidity: 30 + (i % 3) * 2.5 - (i % 2) * 5 + 0.6 * Math.random()
    };
}

updateSVG = function(data){
    svg.selectAll("tspan.m_temp")
        .data(data)
        .text(function(d) {return format_temp(d.temperature) + "°";})

    svg.selectAll("tspan.m_humid")
        .data(data)
        .text(function(d) {return format_humid(d.humidity) + "%";})
}

onTick = function() {
    d3.json("/recent/?n=1", function(err, json) {
        var arr = generateMeasurementArray(6);

        arr[2].temperature = +json[0].temperature;
        arr[2].humidity = +json[0].humidity;

        updateSVG(arr);
    })
}

window.aa = setInterval(onTick, 1000);