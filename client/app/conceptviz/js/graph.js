console.log("hi there");

// move to utils.js

var inc = function(obj, key) {
    if(obj[key] === undefined) {
        obj[key] = 0;
    }
    obj[key] += 1;
    return obj[key];
};

var createSvgEl = function(type, attrs) {
    var el = document.createElementNS("http://www.w3.org/2000/svg", type);
    attrs = attrs || {};
    _.each(attrs, function(value, key) {
        el.setAttribute(key, value);
    });
    return el;
};

var View = Backbone.View.extend({

    el: "#graph",

    LEVEL_GAP: 80,

    MINIMUM_NODE_HEIGHT: 60,

    LEVEL_PADDING: 0,

    LEVEL_GUTTER_WIDTH_FRACTION: 0.4,

    LINE_STROKE_WIDTH: 3,

    initialize: function(options) {
        this.graph = options.graph;

        //for performance reasons, these values are calculated
        //when calculating traffic. 
        this._elementsById = {};
        this._levelByNodeId = {};
        this._paths = {};
    },

    highlightNode: function(id) {

    },

    traverse: function(from, two, time) {

    },

    render: function() {

        this.$nodes =$("<div>");
        this.$el.append(this.$nodes)
        var width = this.$el.width();
        console.log("width: ", width);
        var nodeElementsAndGutters = this.renderNodesAtAllLevels(this.graph.levels, width);
        console.log(nodeElementsAndGutters);
        var traffic = this.computeInfoRequiredToRenderEdges();

        this.initializeSvg();
        this.renderEdges(nodeElementsAndGutters, traffic);
        return this;
    },

    renderNodesAtAllLevels: function(levels, totalWidth) {

        var cumulativeHeight = this.LEVEL_PADDING;
        var depth = levels.length;
        var elements = {};
        var gutters = [];
        for(var i = 0; i < depth; i++) {
            var attrs = {
                nodes: levels[i],
                level: i,
                totalWidth: totalWidth,
                topPosition: cumulativeHeight
            };
            var result = this.renderLevelNodesAndGutters(attrs);
            cumulativeHeight += result.height + this.LEVEL_GAP;
            
            _.extendOwn(elements, result.elements);
            gutters.push(result.gutters); 
        }


        this.$height = (cumulativeHeight - this.LEVEL_GAP + this.LEVEL_PADDING);
        this.$el.css({
            height: this.$height
        });

        return {
            elements: elements,
            gutters: gutters
        };
    },

    renderLevelNodesAndGutters: function(attrs) {
        
        var nodes = attrs.nodes;
        var level = attrs.level;
        var width = attrs.totalWidth;
        var topPosition = attrs.topPosition;

        var result = {
            elements: {},
            height: 0,
            gutters: []
        };

        var length = nodes.length;
        
        var payloadFraction = (1 - this.LEVEL_GUTTER_WIDTH_FRACTION);
        var allNodesWidth = (width - 2*this.LEVEL_PADDING) * payloadFraction;
        var allGuttersWidth = (width -2*this.LEVEL_PADDING) * this.LEVEL_GUTTER_WIDTH_FRACTION;
        
        var gutterLength = length + 1;
        var nodeWidth = allNodesWidth / length;
        var gutterWidth = allGuttersWidth / (gutterLength);
        var currentLeftPosition = this.LEVEL_PADDING + gutterWidth;
        var elements = result.elements;
        var maxHeight = 0;
        for(var i = 0; i < length; i++) {
            
            var node = nodes[i];
            var elAndAttrs = this.renderNode({
                node: node,
                topPosition: attrs.topPosition,
                leftPosition: currentLeftPosition,
                width: nodeWidth
            });

            //caching this now so that we can use it to calculate traffic. 
            this._levelByNodeId[node.id] = level;

            elements[node.id] = elAndAttrs;
            var maxHeight = _.max([elAndAttrs.height, maxHeight]);
            currentLeftPosition += nodeWidth + gutterWidth;
        }

        var gutters = result.gutters;
        for(var j = 0; j < gutterLength; j++) {
            var gutter = {
                leftPosition: (nodeWidth + gutterWidth) * j,
                topPosition: attrs.topPosition,
                width: gutterWidth,
                height: maxHeight
            };
            gutters.push(gutter); 
            // var div = $("<div>").css({
            //     left: gutter.leftPosition,
            //     top: gutter.topPosition,
            //     width: gutterWidth,
            //     height: maxHeight
            // }).addClass("graph-node gutter card");
            // this.$nodes.append(div);
        }

        _.each(elements, function(elAndAttrs) {
            elAndAttrs.el.height(maxHeight);
            elAndAttrs.height = maxHeight;
        });
        result.height = maxHeight;
        return result;
    },

    renderNode: function(attrs) {

        var node = attrs.node;
        var name = $("<h5 class='center'>").html(node.name);
        var el = $("<div>").css({
            width: attrs.width,
            top: attrs.topPosition,
            left: attrs.leftPosition,
            position: 'absolute'
        }).addClass("graph-node card").append(name);

        this.$nodes.append(el);
        this._elementsById[node.id] = el;

        return {
            el: el,
            height: el.height(),
            width: attrs.width,
            top: attrs.topPosition,
            left: attrs.leftPosition,
            id: node.id
        };
    },

    computeInfoRequiredToRenderEdges: function() {
        return this.getTrafficInfo();
    },

    getTrafficInfo: function() {
        var trafficByLevelGap = {};
        var gutterTrafficByLevel = {};
        var edgesDrawnThroughLevelGap = {};
        var edgesDrawnThroughGutter = {};

        var inboundEdgesByNodeId = {};
        var outboundEdgesByNodeId = {};
        var inboundNodeEdgesDrawn = {};
        var outboundNodeEdgesDrawn = {};



        _.each(this.graph.edges, function(edge) {
            var startLevel = this._levelByNodeId[edge.from];
            var endLevel = this._levelByNodeId[edge.to];

            inc(outboundEdgesByNodeId, edge.from);
            inc(inboundEdgesByNodeId, edge.to);
            outboundNodeEdgesDrawn[edge.from] = 0;
            inboundNodeEdgesDrawn[edge.to] = 0;

            for(var i = startLevel; i < endLevel; i++) {
                var fromLevel = i;
                var toLevel = i + 1;
                var key = this.getLevelGapKey(fromLevel, toLevel);
                inc(trafficByLevelGap, key);
                if(toLevel !== endLevel) {
                    inc(gutterTrafficByLevel, toLevel);
                }
            }

        }, this);

        _.each(trafficByLevelGap, function(value, key) {
            edgesDrawnThroughLevelGap[key] = 0;
        });
        _.each(gutterTrafficByLevel, function(value, key) {
            edgesDrawnThroughGutter[key] = 0;
        });

        return {
            inboundEdgesByNodeId: inboundEdgesByNodeId,
            outboundEdgesByNodeId: outboundEdgesByNodeId,
            inboundNodeEdgesDrawn: inboundNodeEdgesDrawn,
            outboundNodeEdgesDrawn: outboundNodeEdgesDrawn,
            trafficByLevelGap: trafficByLevelGap,
            edgesDrawnThroughLevelGap: edgesDrawnThroughLevelGap,
            gutterTrafficByLevel: gutterTrafficByLevel,
            edgesDrawnThroughGutter: edgesDrawnThroughGutter
        };
    },

    getLevelGapKey: function(startLevel, endLevel) {
        return startLevel + "->" + endLevel;
    },

    getEdgeKey: function(edge) {
        return edge.from + "->" + edge.to;
    },

    getTriangleMarkerDefinition: function() {
        var defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
        
        var marker = document.createElementNS("http://www.w3.org/2000/svg", "marker");
        var markerAttrs = {
            "id": "Triangle",
            "viewBox": "0 0 10 10",
            "refX": "0",
            "refY": "5",
            "markerWidth": "5",
            "markerHeight": "5",
            "orient": "auto"
        };
        _.each(markerAttrs, function(value, key) {
            marker.setAttribute(key, value);
        });

        var path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("d", "M0,0 L10,5 L0,10 z");
        
        marker.appendChild(path);
        defs.appendChild(marker);
        return defs
    },

    initializeSvg: function() {
        var svgContainer = $("<div>").attr("id", "graph-svg-container");
        this.svg = createSvgEl("svg", {
            height: this.$height,
            width: this.$el.width()
        });
        var defs = this.getTriangleMarkerDefinition();
        this.svg.appendChild(defs);
        this.$el.append(svgContainer);
        svgContainer[0].appendChild(this.svg);

    },

    //http://stackoverflow.com/questions/20107645/minimizing-number-of-crossings-in-a-bipartite-graph
    //Not using any appromixation algorithms for minimizing edge crossings as of now. 
    renderEdges: function(nodeElementsAndGutters, traffic) {

        var nodeElements = nodeElementsAndGutters.elements;
        var gutters = nodeElementsAndGutters.gutters;

        var outboundEdgesByNodeId = traffic.outboundEdgesByNodeId;
        var inboundEdgesByNodeId = traffic.inboundEdgesByNodeId;
        var outboundNodeEdgesDrawn = traffic.outboundNodeEdgesDrawn;
        var inboundNodeEdgesDrawn = traffic.inboundNodeEdgesDrawn;

        var trafficByLevelGap = traffic.trafficByLevelGap;
        var edgesDrawnThroughLevelGap = traffic.edgesDrawnThroughLevelGap;

        _.each(this.graph.edges, function(edge) {
            var startNode = nodeElements[edge.from];
            var endNode = nodeElements[edge.to];

            var startId = startNode.id;
            var endId = endNode.id;

            var startPoint = this.getStartPoint(startNode, outboundEdgesByNodeId, outboundNodeEdgesDrawn);
            var endPoint = this.getEndPoint(endNode, inboundEdgesByNodeId, inboundNodeEdgesDrawn);

            var startLevel = this._levelByNodeId[startNode.id];
            var endLevel = this._levelByNodeId[endNode.id];
            if(endLevel - startLevel === 1) {
                var key = this.getLevelGapKey(startLevel, endLevel);

                var path = this.getSingleHopPath({
                    startPoint: startPoint,
                    endPoint: endPoint,
                    levelTraffic: trafficByLevelGap,
                    edgesDrawn: edgesDrawnThroughLevelGap,
                    key: key
                });
            }
            else {
                var path = this.getMultiHopPath({
                    startPoint: startPoint,
                    endPoint: endPoint,
                    startLevel: startLevel,
                    endLevel: endLevel,
                    levelTraffic: trafficByLevelGap,
                    levelEdgesDrawn: edgesDrawnThroughLevelGap,
                    gutterTraffic: traffic.gutterTrafficByLevel,
                    gutterEdgesDrawn: traffic.edgesDrawnThroughGutter,
                    gutters: gutters
                });
            }
            this.drawPath(path);
            //this._paths[this.getEdgeKey(edge)] = path;
        }, this);
    },

    getMultiHopPath: function(attrs) {
        console.log(attrs);

        var path = [];

        var gutters = attrs.gutters;
        var startLevel = attrs.startLevel;
        var endLevel = attrs.endLevel;
        var gutterTraffic = attrs.gutterTraffic;
        var gutterEdgesDrawn = attrs.gutterEdgesDrawn;


        var currentPoint = attrs.startPoint;
        var currentLevel = startLevel;
        for(var nextLevel = startLevel + 1; nextLevel < endLevel; nextLevel++) {
            var nextLevelTraffic = gutterTraffic[nextLevel];
            var gutterCount = gutters[nextLevel].length;
            var drawnEdges = gutterEdgesDrawn[nextLevel];
            var chosenGutterIndex = (drawnEdges % nextLevelTraffic ) % gutterCount;

            var chosenGutter = gutters[nextLevel][chosenGutterIndex];
            chosenGutter.drawnEdges = chosenGutter.drawnEdges || 0;


            var minimumGutterTraffic = Math.floor(nextLevelTraffic / gutterCount);
            var chosenGutterTraffic = minimumGutterTraffic;
            var extraEdges = nextLevelTraffic - minimumGutterTraffic * gutterCount; 
            if(chosenGutterIndex < extraEdges) {
                chosenGutterTraffic += 1;
            }
            var pieces = chosenGutter.width / (chosenGutterTraffic + 1)
            var xOffset = (chosenGutter.drawnEdges + 1) * pieces;
            var nextLevelPoint = {
                x: chosenGutter.leftPosition + xOffset,
                y: chosenGutter.topPosition + chosenGutter.height
            }
            
            var key = this.getLevelGapKey(currentLevel, nextLevel);
            var singleHopPath = this.getSingleHopPath({
                startPoint: currentPoint,
                endPoint: nextLevelPoint,
                levelTraffic: attrs.levelTraffic,
                edgesDrawn: attrs.levelEdgesDrawn,
                key: key
            });
            path = path.concat(singleHopPath);

            inc(gutterEdgesDrawn, nextLevel);
            inc(chosenGutter, drawnEdges);
            currentLevel = nextLevel;
            currentPoint = nextLevelPoint;
        }
        var key = this.getLevelGapKey(currentLevel, endLevel);
        var lastPath = this.getSingleHopPath({
            startPoint: currentPoint,
            endPoint: attrs.endPoint,
            levelTraffic: attrs.levelTraffic,
            edgesDrawn: attrs.levelEdgesDrawn,
            key: key
        });
        path = path.concat(lastPath);
        console.log(path);
        return path;
        //phew
    },

    getSingleHopPath: function(attrs) {
        var key = attrs.key;
        var startPoint = attrs.startPoint;
        var endPoint = attrs.endPoint;

        var totalPaths = attrs.levelTraffic[key];
        var drawnPaths = attrs.edgesDrawn[key];
        inc(attrs.edgesDrawn, key);

        var verticalPieces = this.LEVEL_GAP*0.95 / (totalPaths + 1);
        var y = startPoint.y + verticalPieces * (drawnPaths + 1);

        return [
            startPoint, 
            {x: startPoint.x, y: y}, 
            {x: endPoint.x, y: y}, 
            endPoint
        ];
    },

    getStartPoint: function(node, edgesById, edgesDrawn) {
        var point =  this.getPoint(node, edgesById, edgesDrawn);
        point.y += node.height;
        return point;
    },

    getEndPoint: function(node, edgesById, edgesDrawn) {
        return this.getPoint(node, edgesById, edgesDrawn);
    },

    getPoint: function(node, edgesById, edgesDrawn) {
        var id = node.id;
        var width = node.width;
        
        var total = edgesById[id];
        var drawn = edgesDrawn[id];
        inc(edgesDrawn, id);

        var pieces = width / (total + 1);
        var x = node.left + (drawn + 1) * pieces;

        var y = node.top;

        return {
            x: x,
            y: y
        }
    },

    drawPoint: function(point, edge) {
        console.debug("Point", point, "Edge", edge);
        div = $("<div>").css({
            top: point.y,
            left: point.x,
            position: 'absolute'
        }).addClass("graph-line");
        this.$nodes.append(div);
    },

    drawLine: function(start, end, color, isLast) {

        if(isLast) {
            end.y -= 13;
        }

        var line = createSvgEl("line", {
            x1: start.x,
            y1: start.y,
            x2: end.x,
            y2: end.y,
            stroke: color,
            "stroke-width": this.LINE_STROKE_WIDTH
        });
        if(isLast) {
            line.setAttribute("marker-end", "url(#Triangle)");
        }
        this.svg.appendChild(line);
        
    },

    drawPath: function(path) {

        this._drawnCount = this._drawnCount || 1;

        var length = path.length - 1;
        for(var i = 0; i < length; i++) {
            var start = path[i];
            var end = path[i+1];
            this.drawLine(start, 
                          end, 
                          this.getLineColor(this._drawnCount),
                          i === (length - 1));
        }

        this._drawnCount += 1;
    },

    getLineColor: function(drawnCount) {
        //http://stackoverflow.com/a/57805/817277. Thank you.
        var whiteHex = parseInt("FFFFFF", 16);
        var max = Math.floor(whiteHex / 3);
        var decimalStroke = Math.floor(max / (drawnCount + 1));

        var strokeString = decimalStroke.toString(16);
        if(strokeString.length < 6) {
            for(var k = 0; k < (6 - strokeString.length); k++) {
                var c = Math.random().toString().charAt(3)
                strokeString += c; //some arbitrary blue component; 
            }
        }
        var stroke = "#" + strokeString;
        return stroke;
    }

});


g = {
    levels: [
        [
            {
                id: 1,
                name: "One",
            }
        ],
        [
            {
                id: 2,
                name: "Two",
            },
            {
                id: 3,
                name: "Three",
            },
            {
                id: 4,
                name: "Four",
            }
        ],
        [
            {
                id: 5,
                name: "Five",
            },
            {
                id: 6,
                name: "Guiness Book of world records broken by Messi",
            }
        ],
        [
            {
                id: 7,
                name: "Seven",
            },
            {
                id: 8,
                name: "Eight",
            }
            // {
            //     id: 9,
            //     name: "Reader's Digest Book of Facts",
            // },
            // {
            //     id: 10,
            //     name: "Ten",
            // }
        ]
    ],

    edges: [
        {
            from: 1,
            to: 2
        },
        {
            from: 1,
            to: 3
        },
        {
            from: 1,
            to: 4
        },
        {
            from: 3,
            to: 5
        },
        {
            from: 4,
            to: 6
        },
        {
            from: 5,
            to: 7
        },
        {
            from: 6,
            to: 8
        },
        {
            from: 2,
            to: 7
        },
        {
            from: 3,
            to: 8
        },
        {
            from: 1,
            to: 6
        }
    ]
};
var init = function() {
    window.view = new View({
        graph: g
    });
    window.view.render();
};  

$(document).ready(init);