import Ember from 'ember';
import d3lper from  'mapp/utils/d3lper';
import d3 from 'd3';

const DRAGGER_SIZE = 14;

const IDENTITY = function(val) {
  return val;
}
IDENTITY.invert = function(val) {
  return val;
}

export default Ember.Component.extend({

  tagName: 'div',

  value:[0, 0],
  min:0,
  max:10,
  ticks: 3,
  
  tickValues: null,
  
  tickAppend: null,
  tickFormat: ",.2f",
  
  displayTick: false,
  
  scale: null,
  
  _tmpValue: null,
  
  band: null,
  
  transform: IDENTITY,
  
  resizeInterval: null,
  $width: null,
  $height: null,
  
  setup: function() {
    
    this.set('_tmpValue', this.get('value'));
    
    this.set('scale',
      d3.scale.linear()
        .domain([this.get('min'), this.get('max')])
        .clamp(true)
    );
    
  }.on("init"),
  
  initResizeHandler: function() {
    
    // HANDLE RESIZE
    let $size = () => {
      let $width = this.$().parent().width(),
          $height = this.$().parent().height();
      
      if ($width != this.get('$width') || $height != this.get('$height')) {
        this.setProperties({
          '$width': this.$().parent().width(),
          '$height': this.$().parent().height()
        });
      }
    };
    this.set('resizeInterval', setInterval($size, 500));
    $size();
    // ---------
    
  }.on("didInsertElement"),
  
  cleanup: function() {
    clearInterval(this.get('resizeInterval'));
  }.on("willDestroyElement"),
  
  draw: function() {
    
    let margin = {
          l: parseInt( this.$(".slider").css("marginLeft") ),
          r: parseInt( this.$(".slider").css("marginRight") )
        },
        tickSize = 6,
        width = (this.$().width() - (margin.l + margin.r));
    
    let scale = this.get('scale');
    
    scale.range([0, width-DRAGGER_SIZE]);
    
    let svg = this.d3l().select(".slider")
      .style("left", "-8px")
      .style("width", (width+12) + "px");
    
    let sliderG = this.d3l().select(".slider")
      .append("g")
      .attr("transform", "translate(6, 16)");
    
    // Axis      
    var axis = d3.svg.axis()
      .scale(scale)
      .orient("bottom")
      .tickSize(0)
      .ticks(0);
    
    sliderG.append("g")
      .classed("axis", true)
      .attr("transform", `translate(${DRAGGER_SIZE/2},0)`)
      .call(axis);
      
    if (this.get('band') != null) {
      
      let bandPx = scale(this.get('min')+this.get('band')) - scale(this.get('min'));
      
      if (bandPx > 5) {
        sliderG.select(".axis")
          .append("line")
          .classed("ticks", true)
          .attr({
            x1: bandPx,
            y1: 0,
            x2: width - DRAGGER_SIZE,
            y2: 0
          })
          .attr("stroke-dasharray", `1, ${bandPx-1}`)
          .style("stroke", "white");
      }
      
    }
    
    // Dragger
    ["L", "R"].forEach((ori) => {

      let dragger = sliderG.append("g")
        .classed("dragger", true)
        .classed(ori, true);

      dragger.append("polygon")
        .attr({
          points: d3lper.polyPoints([
            [-DRAGGER_SIZE/2, -DRAGGER_SIZE/8],
            [0, -DRAGGER_SIZE/2],
            [0, DRAGGER_SIZE/2],
            [-DRAGGER_SIZE/2, DRAGGER_SIZE/8]
          ]),
          transform: ori === "R" ? "rotate(-180)" : null
        });
      
      if (this.get('displayTick')) {  
        dragger.append("text")
          .classed("value", true)
          .attr({
            x: 0,
            y: -8,
            "text-anchor": "middle"
          });
      }
        
      // Enable dragger drag 
      var dragBehaviour = d3.behavior.drag();
      dragBehaviour.on("drag", this.moveDragger.bind(this, ori));
      dragger.call(dragBehaviour);

    });
    
    this.valueChange();
    
  }.on('didInsertElement'),

  redraw() {
    this.d3l().selectAll(".slider *").remove();
    this.draw();
  },
  
  onResize: function() {
    this.redraw();
  }.observes('$width', '$height'),

  onMinMaxChange: function() {
    this.setup();
    this.redraw();
  }.observes('min', 'max'),
  
  moveDragger(ori) {
    let vIdx = ori === "L" ? 0 : 1,
        scale = this.get('scale'),
        minX = ori === "L" ? 0 : scale(this.get('_tmpValue')[0]),
        maxX = ori === "L" ? scale(this.get('_tmpValue')[1]) : scale.range()[1],
        pos = Math.max(minX, Math.min(maxX, d3.event.x)),
        tmpVal = this.stepValue(this.transform(scale.invert(pos)));
    
    this.translate(tmpVal, ori);
    
    if (this.get('_tmpValue')[vIdx] != tmpVal) {
      this.get('_tmpValue')[vIdx] = tmpVal;
      Ember.run.debounce(this, this.commitValue, 120);
    }
  },
  
  stepValue(val) {
    
    let scale = this.get('scale'),
        band = this.get('band');

    val = Math.min(this.get('max'), Math.max(this.get('min'), val));
        
    if (band) {

      if (val === scale.domain()[0] || val === scale.domain()[1]) {
        return val;
      }

      var alignValue = val;
      
      var valModStep = (val - scale.domain()[0]) % band;
      alignValue = val - valModStep;

      if (Math.abs(valModStep) * 2 >= band) {
        alignValue += (valModStep > 0) ? band : -band;
      }
      
      return alignValue;
      
    } else {
      
      return val;
      
    }

  },
  
  translate(val, ori) {

    let translate = this.get('scale')(this.get('transform').invert(val)) + DRAGGER_SIZE / 2;
    
    this.displayValue();
    
    this.d3l().selectAll(`.slider .dragger.${ori}`)
      .transition()
      .ease("cubic-out")
      .duration(100)
      .attr("transform", `translate(${translate}, 0)`);
    
  },
  
  displayValue: function() {
    
    let d3format = (d) => d,
        formatter;
        
    if (this.get('tickFormat')) {
      d3format = (d) => d3.format(this.get('tickFormat'))(d);
    }
    
    if (this.get('tickAppend') != null) {
        formatter = (d) => d3format(d) + this.get('tickAppend');
    } else {
        formatter = (d) => d3format(d);
    }
    
    if (this.$()) {
      this.d3l().selectAll(".slider .dragger.L text")
        .text(formatter(this.get('_tmpValue')[0]));
      this.d3l().selectAll(".slider .dragger.R text")
        .text(formatter(this.get('_tmpValue')[1]));
    }
    
  },

  commitValue: function() {
    this.set('value', this.get('_tmpValue').slice());
  },
  
  /*tmpValueChange: Ember.debouncedObserver('_tmpValue', function() {
    this.set('value', this.get('_tmpValue'));
  }, 120),*/
  
  valueChange: function() {
    
    ["L", "R"].forEach(ori => {
      let vIdx = ori === "L" ? 0 : 1;
      let val = this.stepValue(this.get('value')[vIdx]);
      if (val != this.get('value')[vIdx]) {
        this.get('_tmpValue')[vIdx] = val;
      }
      this.translate(val, ori);
    });
    
  }.observes('value')

});
