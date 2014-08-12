d3.selection.prototype.moveToFront = function() {
  return this.each(function(){
    this.parentNode.appendChild(this);
  });
};

var format = d3.time.format("%Y-%m-%d %H:%M:%S %Z")

function color_fill(d){
  if (d.value['sensor'] == 'network'){
    return "coral";
  } else if (d.value['sensor'] == 'network') {
    return "green";
  } else {
    return "steelblue";
  }
}