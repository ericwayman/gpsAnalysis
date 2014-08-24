var locationData;
var sensorData;

// Create the Google Map…
var map = new google.maps.Map(d3.select("#map").node(), {
  zoom: 10,
  center: new google.maps.LatLng(41.49, 2.35),
  mapTypeId: google.maps.MapTypeId.HYBRID
});

// TOOLTIP DIV
var tooltip = d3.select("body")
  .append("div")
  .attr("class","tooltip")
  .style("position", "absolute")
  .style("z-index", "10")
  .style("visibility", "hidden");

// SCATTERPLOT ELEMENTS
var margin = {top: 15, right: 20, bottom: 30, left: 40},
    padding = 10,
    width = 900 - margin.left - margin.right,
    height = 130 - margin.top - margin.bottom;
    smallHeight = 57 - margin.top - margin.bottom;

/* 
 * value accessor - returns the value to encode for a given data object.
 * scale - maps value to a visual display encoding, such as a pixel position.
 * map function - maps from data value to display value
 * axis - sets up axis
 */ 

// setup x 
var xValue = function(d) {return format.parse(d['time']);}, // data -> value
    xScale = d3.time.scale().range([0, width]), // value -> display
    xMap = function(d) { return xScale(xValue(d));}, // data -> display
    xAxis = d3.svg.axis().scale(xScale).orient("bottom");

// setup y
var yValue = function(d) { return d['speed'];}, // data -> value
    yScale = d3.scale.linear().range([height, 0]), // value -> display
    yMap = function(d) { return yScale(yValue(d));}, // data -> display
    yAxis = d3.svg.axis().scale(yScale).orient("left");

var colorScale = d3.scale.linear().range(['red','green']).domain([1000,0])

// setup accelerometer readings
var accScale = d3.scale.linear().range([height,0]).domain([-0.5,0.5]);
    accAxis = d3.svg.axis().scale(accScale).orient("left")

// setup the gps line
var line = d3.svg.line()
          .x(function(d) { return xMap(d); })
          .y(function(d) { return yMap(d); });
var abs_accline;

// add the speed timeseries graph canvas to the body of the webpage
var gps_speed_timeseries_svg = d3.select("body").append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .style('cursor','pointer')
  .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
gps_speed_timeseries_svg.append("clipPath")
  .attr("id","clip-gps")
  .append('rect')
    .attr({
      'width':width,
      'height':height+margin.bottom,
    })

// add the network/wifi measurements
var network_speed_timeseries_svg = d3.select("body").append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", smallHeight + margin.top + margin.bottom)
    .style('cursor','pointer')
  .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
network_speed_timeseries_svg.append("clipPath")
  .attr("id","clip-network")
  .append('rect')
    .attr({
      'width':width,
      'height':smallHeight+margin.bottom,
    })

// add the acc sensor timeseries graph canvas to the body
var acc_timeseries_svg = d3.select("body").append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
  .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
acc_timeseries_svg.append("clipPath")
  .attr("id","clip-acc")
  .append('rect')
    .attr({
      'width':width,
      'height':height+margin.bottom,
    })

// Elements of the map focus group
var mapFocus;
var projection;

// Zoom behavior
// create the zoom listener
// Zoom function
function draw() {
  gps_speed_timeseries_svg.select("g.x.axis").call(xAxis);
  gps_speed_timeseries_svg.select("g.y.axis").call(yAxis);
  gps_speed_timeseries_svg.select(".line").attr("d", line);
  gps_speed_timeseries_svg.selectAll(".dot").attr("cx",xMap);
  network_speed_timeseries_svg.select("g.x.axis").call(xAxis);
  network_speed_timeseries_svg.selectAll(".dot").attr("cx",xMap);
  acc_timeseries_svg.select("g.x.axis").call(xAxis);
  acc_timeseries_svg.select(".line").attr("d", abs_accline);
}

var zoom = d3.behavior.zoom()
  .on("zoom", draw);

// Load the location data.
d3.json("Outbound/Location_20140808_inicio_0647.txt", function(data) {
// d3.json("Inbound/Location_20140808_inicio_0817.txt", function(data) {
  locationData = data;
  var overlay = new google.maps.OverlayView();

  // Add the container when the overlay is added to the map.
  overlay.onAdd = function() {
    var layer = d3.select(this.getPanes().floatPane).append("div")
        .attr("class", "stations");

    // Draw each marker as a separate SVG element.
    // We could use a single SVG, but what size would it have?
    overlay.draw = function() {
      projection = this.getProjection();

      var marker = layer.selectAll(".marker")
          .data(d3.entries(data))
          .each(transform) // update existing markers
        .enter().append("svg:svg")
          .each(transform)
          .attr("class", "marker")
          .style({
            "fill": color_fill,
            "pointer-events":"none"
          });

      // Add a circle.
      marker.append("svg:circle")
          .attr("r", 4.5)
          .attr("cx", padding)
          .attr("cy", padding)
          .style({
            "pointer-events":"auto",
            "cursor":"pointer",
          })
          .on("mouseover", function(){return tooltip.style("visibility", "visible");})
          .on("mousemove", function(d){
            tooltip.html(generate_tooltip(d));
            return tooltip.style("top", (event.pageY-10)+"px").style("left",(event.pageX+10)+"px");
          })
          .on("mouseout", function(){return tooltip.style("visibility", "hidden");});;

      function transform(d) {
        d = new google.maps.LatLng(d.value['lat'], d.value['lon']);
        d = projection.fromLatLngToDivPixel(d);
        return d3.select(this)
            .style("left", (d.x - padding) + "px")
            .style("top", (d.y - padding) + "px");
      }

      function generate_tooltip(d){
        return "Sensor: " + d.value['sensor']
          + "<br>Latitude: " + d.value['lat']
          +"<br>Longitude: " + d.value['lon']
          +"<br>Speed: " + d.value['speed']
          +"<br>Time: " + d.value['time'].substring(11,19);
      }        
    };

    mapFocus = layer.append('svg')
        .attr({
          'class':'mapFocus',
        })
        .append('g')
          .attr('class','mapFocus-g')
          .style('display','none');
    
    mapFocus.append('circle')
        .attr({
          'id':'mapFocusCircle',
          'r':7,
          'class':'circle focusCircle',
          'cx':9,
          'cy':9,
        });
  };

  // Bind our overlay to the map…
  overlay.setMap(map);

  // Scatterplot drawing (speed timeseries)
  // don't want dots overlapping axis, so add in buffer to data domain
  xScale.domain(d3.extent(data,xValue));
  zoom.x(xScale)
  yScale.domain(d3.extent(data,yValue));

  // x-axis
  gps_speed_timeseries_svg.append("g")
      .attr("class", "x axis")
      .attr("transform", "translate(0," + height + ")")
      .call(xAxis)
    .append("text")
      .attr("class", "label")
      .attr("x", width)
      .attr("y", -6)
      .style("text-anchor", "end")
      .text("Time");

  network_speed_timeseries_svg.append("g")
      .attr("class", "x axis")
      .attr("transform", "translate(0," + smallHeight/4 + ")")
      .call(xAxis)
    .append("text")
      .attr("class", "label")
      .attr("x", width)
      .attr("y", -6)
      .style("text-anchor", "end")
      .text("Time");

  // y-axis
  gps_speed_timeseries_svg.append("g")
      .attr("class", "y axis")
      .call(yAxis)
    .append("text")
      .attr("class", "label")
      .attr("transform", "rotate(-90)")
      .attr("y", 6)
      .attr("dy", ".71em")
      .style("text-anchor", "end")
      .text("Speed (m/s)");

  // draw line connecting gps points
  gps_speed_timeseries_svg.append('path')
    .datum(data.filter(function(d){return d['sensor'] == 'gps'}))
    .attr('class', 'line')
    .attr('d', line)
    .attr("clip-path", "url(#clip-gps)");

  // draw dots
  gps_speed_timeseries_svg.append('g').attr("class","g-circles").selectAll(".dot")
      .data(data.filter(function(d){return d['sensor'] == 'gps'}))
    .enter().append("circle")
      .attr("class", "dot")
      .attr("r", 3.5)
      .attr("cx", xMap)
      .attr("cy", yMap)
      .attr("clip-path", "url(#clip-gps)")
      .style("fill", 'steelblue');


  network_speed_timeseries_svg.append('g').attr("class","g-circles").selectAll(".dot")
      .data(data.filter(function(d){return d['sensor'] == 'network'}))
    .enter().append("circle")
      .attr("class", "dot")
      .attr("r", 2.5)
      .attr("cx", xMap)
      .attr("cy", smallHeight/4)
      .attr("clip-path", "url(#clip-network)")
      .style("fill", function(d){return colorScale(d['accuracy'])});

  // Adding the focus tracking to speed and network measurements
  // focus tracking
  var gps_focus = gps_speed_timeseries_svg.append('g').style('display', 'none');
  var network_focus = network_speed_timeseries_svg.append('g').style('display', 'none');
      
  gps_focus.append('line')
      .attr('id', 'focusLineX')
      .attr('class', 'focusLine');
  gps_focus.append('line')
      .attr('id', 'focusLineY')
      .attr('class', 'focusLine');
  gps_focus.append('circle')
      .attr('id', 'focusCircle')
      .attr('r', 5)
      .attr('class', 'circle focusCircle');

  network_focus.append('circle')
      .attr('id', 'focusCircle')
      .attr('r', 5)
      .attr('class', 'circle focusCircle');

  var bisectDate = d3.bisector(xValue).left; 

  gps_speed_timeseries_svg.append('rect')
      .attr('class', 'overlay')
      .attr('width', width)
      .attr('height', height)
      .on('mouseover', function() { 
        gps_focus.style('display', null);
        d3.select('.mapFocus-g').style('display', null); 
        d3.select('.mapFocus').moveToFront();
      })
      .on('mouseout', function() { 
        gps_focus.style('display', 'none');
        d3.select('.mapFocus-g').style('display', 'none');  
      })
      .on('mousemove', function() { 
          var mouse = d3.mouse(this);
          var mouseDate = xScale.invert(mouse[0]);
          var i = bisectDate(data.filter(function(d){return d['sensor'] == 'gps'}), mouseDate); // returns the index to the current data item

          var d0 = data.filter(function(d){return d['sensor'] == 'gps'})[i - 1]
          var d1 = data.filter(function(d){return d['sensor'] == 'gps'})[i];
          // work out which date value is closest to the mouse
          if (d0 == undefined) {
            var d = d1;
          } else if (d1 == undefined){
            var d = d0;
          } else {
            var d = mouseDate - d0['time'] > d1['time'] - mouseDate ? d1 : d0;
          }

          var x = xScale(xValue(d));
          var y = yScale(yValue(d));

          gps_focus.select('#focusCircle')
              .attr('cx', x)
              .attr('cy', y);
          gps_focus.select('#focusLineX')
              .attr('x1', x).attr('y1', 0)
              .attr('x2', x).attr('y2', height);
          gps_focus.select('#focusLineY')
              .attr('x1', 0).attr('y1', y)
              .attr('x2', width).attr('y2', y);
      
          // Change the location of the map focus
          gmapLL = new google.maps.LatLng(d['lat'],d['lon']);
          proj = projection.fromLatLngToDivPixel(gmapLL);
          d3.select('.mapFocus')
              .style("left", (proj.x - padding) + "px")
              .style("top", (proj.y - padding) + "px");
      })
      .call(zoom);
  
network_speed_timeseries_svg.append('rect')
    .attr('class', 'overlay')
    .attr('width', width)
    .attr('height', smallHeight)
    .on('mouseover', function() { 
      network_focus.style('display', null);
      d3.select('.mapFocus-g').style('display', null); 
      d3.select('.mapFocus').moveToFront();
    })
    .on('mouseout', function() { 
      network_focus.style('display', 'none');
      d3.select('.mapFocus-g').style('display', 'none');  
    })
    .on('mousemove', function() { 
        var mouse = d3.mouse(this);
        var mouseDate = xScale.invert(mouse[0]);
        var i = bisectDate(data.filter(function(d){return d['sensor'] == 'network'}), mouseDate); // returns the index to the current data item

        var d0 = data.filter(function(d){return d['sensor'] == 'network'})[i - 1]
        var d1 = data.filter(function(d){return d['sensor'] == 'network'})[i];
        // work out which date value is closest to the mouse
        if (d0 == undefined) {
          var d = d1;
        } else if (d1 == undefined){
          var d = d0;
        } else {
          var d = mouseDate - d0['time'] > d1['time'] - mouseDate ? d1 : d0;
        }

        var x = xScale(xValue(d));
        var y = smallHeight/4;

        network_focus.select('#focusCircle')
            .attr('cx', x)
            .attr('cy', y);
    
        // Change the location of the map focus
        gmapLL = new google.maps.LatLng(d['lat'],d['lon']);
        proj = projection.fromLatLngToDivPixel(gmapLL);
        d3.select('.mapFocus')
            .style("left", (proj.x - padding) + "px")
            .style("top", (proj.y - padding) + "px");
    });

  // Load the accelerometer data and plot it.
  d3.json("Outbound/Sensors_20140808_inicio_0647.txt", function(data) {
  // d3.json("Inbound/Sensors_20140808_inicio_0817.txt", function(data) {
    sensorData = data;

    // setup the gps line
    var acc1line = d3.svg.line()
              .x(function(d) { return xMap(d); })
              .y(function(d) { return accScale(d['Acc1']); });

    var acc2line = d3.svg.line()
              .x(function(d) { return xMap(d); })
              .y(function(d) { return accScale(d['Acc2']); });

    var acc3line = d3.svg.line()
              .x(function(d) { return xMap(d); })
              .y(function(d) { return accScale(d['Acc3']); });

    abs_accline = d3.svg.line()
              .x(function(d) { return xMap(d); })
              .y(function(d) { 
                return accScale(Math.sqrt(d['Acc1']*d['Acc1']
                  +d['Acc2']*d['Acc2']
                  +d['Acc3']*d['Acc3'])
                  -9.81); 
              });

    // x-axis
    acc_timeseries_svg.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + height + ")")
        .call(xAxis)
      .append("text")
        .attr("class", "label")
        .attr("x", width)
        .attr("y", -6)
        .style("text-anchor", "end")
        .text("Time");

    // y-axis
    acc_timeseries_svg.append("g")
        .attr("class", "y axis")
        .call(accAxis)
      .append("text")
        .attr("class", "label")
        .attr("transform", "rotate(-90)")
        .attr("y", 6)
        .attr("dy", ".71em")
        .style("text-anchor", "end")
        .text("Acc.");

    // Draw the three accelerometer paths
    // draw line connecting gps points
    // acc_timeseries_svg.append('path')
    //   .attr({'class':'gps-path'})
    //   .datum(data)
    //   .attr('class', 'line')
    //   .attr('d', acc1line)
    //   .style({
    //     'fill': 'none',
    //     'stroke': 'steelblue',
    //     'stroke-width': '2px',
    //   })

    // acc_timeseries_svg.append('path')
    //   .attr({'class':'gps-path'})
    //   .datum(data)
    //   .attr('class', 'line')
    //   .attr('d', acc2line)
    //   .style({
    //     'fill': 'none',
    //     'stroke': 'coral',
    //     'stroke-width': '2px',
    //   })

    // acc_timeseries_svg.append('path')
    //   .attr({'class':'gps-path'})
    //   .datum(data)
    //   .attr('class', 'line')
    //   .attr('d', acc3line)
    //   .style({
    //     'fill': 'none',
    //     'stroke': 'gray',
    //     'stroke-width': '2px',
    //   })

    acc_timeseries_svg.append('path')
      .datum(data)
      .attr('class', 'line')
      .attr('d', abs_accline)
      .attr("clip-path", "url(#clip-acc)")
      .style({
        'fill': 'none',
        'stroke': 'lightgreen',
        'stroke-width': '2px',
      })
  });
});