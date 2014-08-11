var mData;
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
var margin = {top: 20, right: 20, bottom: 30, left: 40},
    padding = 10,
    width = 900 - margin.left - margin.right,
    height = 300 - margin.top - margin.bottom;

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

// setup the gps line
var line = d3.svg.line()
          .x(function(d) { return xMap(d); })
          .y(function(d) { return yMap(d); });

// add the graph canvas to the body of the webpage
var svg = d3.select("body").append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .style('cursor','pointer')
  .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

// Elements of the map focus group
var mapFocus;
var projection;

// Load the station data. When the data comes back, create an overlay.
d3.json("Inbound/Location_20140808_inicio_0817.txt", function(data) {
  mData = data;
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
  yScale.domain(d3.extent(data,yValue));

  // x-axis
  svg.append("g")
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
  svg.append("g")
      .attr("class", "y axis")
      .call(yAxis)
    .append("text")
      .attr("class", "label")
      .attr("transform", "rotate(-90)")
      .attr("y", 6)
      .attr("dy", ".71em")
      .style("text-anchor", "end")
      .text("Speed");

  // draw line connecting gps points
  svg.append('path')
    .attr({'class':'gps-path'})
    .datum(data.filter(function(d){return d['sensor'] == 'gps'}))
    .attr('class', 'line')
    .attr('d', line);

  // draw dots
  svg.append('g').attr("class","g-circles").selectAll(".dot")
      .data(data)
    .enter().append("circle")
      .attr("class", "dot")
      .attr("r", 3.5)
      .attr("cx", xMap)
      .attr("cy", yMap)
      .style("fill", color_fill2)

  // Adding the focus tracking
  // focus tracking
  var focus = svg.append('g').style('display', 'none');
      
  focus.append('line')
      .attr('id', 'focusLineX')
      .attr('class', 'focusLine');
  focus.append('line')
      .attr('id', 'focusLineY')
      .attr('class', 'focusLine');
  focus.append('circle')
      .attr('id', 'focusCircle')
      .attr('r', 7)
      .attr('class', 'circle focusCircle');


  var bisectDate = d3.bisector(xValue).left; 

  svg.append('rect')
      .attr('class', 'overlay')
      .attr('width', width)
      .attr('height', height)
      .on('mouseover', function() { 
        focus.style('display', null);
        d3.select('.mapFocus-g').style('display', null); 
        d3.select('.mapFocus').moveToFront();
      })
      .on('mouseout', function() { 
        focus.style('display', 'none');
        d3.select('.mapFocus-g').style('display', 'none');  
      })
      .on('mousemove', function() { 
          var mouse = d3.mouse(this);
          var mouseDate = xScale.invert(mouse[0]);
          var i = bisectDate(data, mouseDate); // returns the index to the current data item

          var d0 = data[i - 1]
          var d1 = data[i];
          // work out which date value is closest to the mouse
          var d = mouseDate - d0['time'] > d1['time'] - mouseDate ? d1 : d0;

          var x = xScale(xValue(d));
          var y = yScale(yValue(d));

          focus.select('#focusCircle')
              .attr('cx', x)
              .attr('cy', y);
          focus.select('#focusLineX')
              .attr('x1', x).attr('y1', 0)
              .attr('x2', x).attr('y2', height);
          focus.select('#focusLineY')
              .attr('x1', 0).attr('y1', y)
              .attr('x2', width).attr('y2', y);
      
          // Change the location of the map focus
          gmapLL = new google.maps.LatLng(d['lat'],d['lon']);
          proj = projection.fromLatLngToDivPixel(gmapLL);
          d3.select('.mapFocus')
              .style("left", (proj.x - padding) + "px")
              .style("top", (proj.y - padding) + "px");
      });

});