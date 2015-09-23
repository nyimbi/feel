"use strict";

var app = {
    levelGap: 80,
    ns: 'http://www.w3.org/2000/svg',
    NO_JUMP_STRAIGHT: 1,
    NO_JUMP_CRISS_CROSS: 2,
    JUMP: 3,
    SVG_PADDING_FRACTION: 0.05,
    STROKE_WIDTH: 3
};

var graph = {

    levels: [

                [
                    {
                        name: "Projection of a vector on another",
                        chapterIndex: 1,
                        id: 1
                    }
                ],

                [
                    {
                        name: "Projection of a vector on a subspace",
                        chapterIndex: 2,
                        id: 2
                    },
                    {
                        name: "Least Squares.",
                        chapterIndex: 1,
                        id: 3
                    },
                    {
                        name: "What the ",
                        chapterIndex: 2,
                        id: 1000
                    },

                    {
                        name: "F",
                        chapterIndex: 2,
                        id: 1001
                    },

                    {
                        name: "Awesome",
                        chapterIndex: 2,
                        id: 1002
                    }

                ],

                [
                    {
                        name: "Projection of a vector on a subspace",
                        chapterIndex: 1,
                        id: 4
                    },
                    {
                        name: "Least Squares.",
                        chapterIndex: 1,
                        id: 5
                    },
                    {
                        name: "Projection of a vector on a subspace",
                        chapterIndex: 1,
                        id: 100
                    },
                    {
                        name: "Least Squares.",
                        chapterIndex: 1,
                        id: 101
                    },
                    {
                        name: "Yeah.",
                        chapterIndex: 1,
                        id: 102
                    }
                ],

                [
                    {
                        name: "Left",
                        chapterIndex: 2,
                        id: 11
                    },

                    {
                        name: "And Center",
                        chapterIndex: 2,
                        id: 14
                    },

                    {
                        name: "Right",
                        chapterIndex: 2,
                        id: 12
                    }
                ],

                [
                    {
                        name: "Gram Schmidt",
                        chapterIndex: 2,
                        id: 6
                    }
                ]
    ],

    edges: [
        {
            from: 2,
            to: 4
        },
        {
            from: 3,
            to: 4
        },
        {
            from: 1000,
            to: 4
        },
        {
            from: 1001,
            to: 4
        },
        {
            from: 2,
            to: 102
        },

        // {
        //     from: 1,
        //     to: 6
        // },

        // {
        //     from: 1,
        //     to: 11
        // }
    ]
};

var drawArrowEntry = function(nodeAttrs, svg) {
    var circle = document.createElementNS(app.ns, 'circle');
    var attrs = {
        cx: nodeAttrs.arrowEntry_x,
        cy: nodeAttrs.arrowEntry_y,
        r: 5,
        fill: "red"
    };

    //#todo -> add a python like iteritems function to utils
    _.each(_.keys(attrs), function(key) {
        circle.setAttribute(key, attrs[key]);
    });
    //console.log("Circle", attrs);
    //svg.append(circle);
};

var drawCircle = function(attrs, svg) {
    var circle = document.createElementNS(app.ns, 'circle');

    _.each(_.keys(attrs), function(key) {
        circle.setAttribute(key, attrs[key]);
    });
    svg.append(circle);
}

var getForeignObjectAttrs = function(levelIndex, position, levelConceptCount, levelWidth, levelHeight) {

    var leftPadding, rightPadding; 
    var paddingFraction = app.SVG_PADDING_FRACTION;
    //5% padding each side
    leftPadding = rightPadding = levelWidth * paddingFraction / 2; 
    
    var payloadWidth = levelWidth * (1 - paddingFraction);
    var totalGapBetweenNodes, totalNodeWidth;
    if(levelConceptCount === 1) {
        totalGapBetweenNodes = 0;
        totalNodeWidth = payloadWidth * 0.5;
        leftPadding += payloadWidth * 0.25;
    }
    else {
        totalGapBetweenNodes = Math.floor(payloadWidth * 0.1);
        totalNodeWidth = Math.floor(payloadWidth * 0.9);
    }
    var nodeWidth = totalNodeWidth / levelConceptCount;

    var leftMarginWidth;
    if(levelConceptCount === 1) {
        leftMarginWidth = 0;
    }
    else {
        leftMarginWidth = totalGapBetweenNodes / (levelConceptCount - 1);
    }

    var x = leftPadding + position*nodeWidth + position*leftMarginWidth;

    var attrs = {
        x: x,
        y: levelHeight,
        width: nodeWidth
    };

    return attrs;
};

var drawNode = function(node, levelIndex, position, levelConceptCount, svgAttrs, levelHeight) {
    
    var svg = svgAttrs.svg;
    var svgWidth = svgAttrs.width;

    var chapterClass = "chapter-box-" + node.chapterIndex;
    var h4 = $("<h4>").html(node.name + " - " + node.id);
    var p = $("<p>").addClass("concept-box").addClass(chapterClass).append(h4);

    //foreignObject does not work on IE #todo. But my initial technical audience does not use IE, I guess? 
    //And making aligning svg text is a pain
    var attrs = getForeignObjectAttrs(levelIndex, position, levelConceptCount, svgWidth, levelHeight);
    var f = document.createElementNS('http://www.w3.org/2000/svg', 'foreignObject')
    console.log("Node", attrs, node, " at level ", levelIndex, " in position", position);


    f = $(f).append(p).attr(attrs);
    svg.append(f);
    var height = p.height();
    f.attr("height", height); //for safari

    return {
        width: attrs.width,
        height: height,
        arrowEntry_x: Math.floor( (attrs.x*2 + attrs.width)/2 ),
        arrowEntry_y: Math.floor( (attrs.y - app.levelGap/2) ),
        x: attrs.x,
        y: attrs.y,
        node: f,
        f: f,
        p: p,
        levelIndex: levelIndex,
        levelConceptCount: levelConceptCount,
        levelPosition: position,
        drawnOutEdges: 0,
        drawnInEdges: 0
    };
};

var drawLevelNodes = function(level, levelIndex, svgAttrs, levelHeight) {

    var i, length;
    length = level.length;


    var maxHeight = 0;
    var levelNodes = {};
    var levelNodesArray = [];
    for(i = 0; i < length; i++) {
        var node = level[i];
        var nodeAttrs = drawNode(node, levelIndex, i, length, svgAttrs, levelHeight);
        levelNodes[node.id] = nodeAttrs;
        levelNodesArray.push(nodeAttrs);
        var height = nodeAttrs.height;
        maxHeight = _.max([maxHeight, height]);
        drawArrowEntry(nodeAttrs, svgAttrs.svg);
    }
    console.log("Max height at level ", levelIndex, " is ", maxHeight);
    console.log("-----------------------   End of level ", levelIndex,  "-------------------------------");

    _.each(levelNodes, function(n) {
        n.p.css("height", maxHeight);
        n.f.attr("height", maxHeight); //for safari -> which is taking me on a safari. 
        n.height = maxHeight;        
    });

    //callejon -> Yeah, I know one Spanish word from the song `La Diosa del carnaval`
    var alleys = [];
    var length = levelNodesArray.length;

    for(var j = 1; j < length; j++) {
        var one = levelNodesArray[j-1];
        var two = levelNodesArray[j];
        var alleyAttrs = {
            x_start: one.x + one.width,
            x_end: two.x,
            y_start: one.y,
            y_end: one.y + one.height,
            id: levelIndex + "-" + one.levelPosition + "-" + two.levelPosition
        }
        alleys.push(alleyAttrs);
        
    }

    if(length === 1) {
        var onlyNode = levelNodesArray[0];
        var levelWidth = svgAttrs.width;
        var paddingWidth = app.SVG_PADDING_FRACTION * levelWidth;
        var payloadWidth = (1 - app.SVG_PADDING_FRACTION) * levelWidth;


        var leftAlleyAttrs = {
            x_start: paddingWidth/2,
            x_end: onlyNode.x,
            y_start: onlyNode.y,
            y_end: onlyNode.y + onlyNode.height
        };
        alleys.push(leftAlleyAttrs);
        var rightAlleyAttrs = {
            x_start: onlyNode.x + onlyNode.width,
            x_end: levelWidth - paddingWidth/2,
            y_start: onlyNode.y,
            y_end: onlyNode.y + onlyNode.height

        }
        alleys.push(rightAlleyAttrs);
    }

    _.each(alleys, function(a) {
        var circleAttrs = {
            cx: (a.x_start + a.x_end) / 2,
            cy: (a.y_start + a.y_end) / 2,
            r: 5,
            fill: "red"
        };
        drawCircle(circleAttrs, svgAttrs.svg);
    });

    return {
        levelNodes: levelNodes,
        maxHeight: maxHeight,
        alleys: alleys
    };
};

var drawLine = function(attrs, svg) {

    var line = document.createElementNS(app.ns, 'line');

    //#todo -> add a python like iteritems function to utils
    _.each(_.keys(attrs), function(key) {
        line.setAttribute(key, attrs[key]);
    });

    svg.append(line);
};

var testDrawLine = function(svg) {

    var attrs = {
        x1: 100,
        y1: 50,
        x2: 100,
        y2: 500,
        stroke: "black",
        "stroke-width": app.STROKE_WIDTH,
        "marker-end": "url(#Triangle)"
    };
    drawLine(attrs, svg);
};   


var isTwoDirectlyBelowOne = function(one, two) {
    return one.levelIndex === two.levelIndex - 1 && 
           one.levelConceptCount === two.levelConceptCount && 
           one.levelPosition === two.levelPosition;
}

var isNoJumpRequired = function(one, two) {
    return one.levelIndex === two.levelIndex - 1;
};


var calculateLineTouchPoint = function(start_x, end_x, width, drawnCount, totalCount) {
    
    if(totalCount === 1) {
        return (start_x + end_x) / 2;
    }
    
    else {
        var direction = drawnCount % 2 === 0 ? -1 : 1;
        var divisionUnit = width/(totalCount + 1);
        var directionCount = Math.floor(drawnCount / 2);
        var offset = direction * divisionUnit * (directionCount+1);
        return (start_x + end_x)/2 + offset*0.9;
    }
};

var drawNoJumpStraightLineBetweenOneAndTwo = function(one, two, svg) {
    var lineAttrs = {
        x1: one.arrowEntry_x,
        y1: one.y + one.height,
        x2: two.arrowEntry_x,
        y2: two.y - 15,
        stroke: "black",
        "stroke-width": app.STROKE_WIDTH,
        "marker-end": "url(#Triangle)"
    };
    drawLine(lineAttrs, svg); 
}

var drawNoJumpPathBetweenOneAndTwo = function(one, two, drawnCount, totalCount, svg) {
    /*
                                                                
                                |
         _______________________|
        |
        |

    */

    console.info("Out count: ", one.outCount);


    var positions = new Array(totalCount);
    for(var i = 0; i < totalCount; i++) {
        positions[i] = 0.85 * app.levelGap*(i + 1) / (totalCount + 1)
    };

    var gap = positions[drawnCount];

    console.info("Gap", gap, one, two);

    //http://stackoverflow.com/a/57805/817277. Thank you.
    var whiteHex = parseInt("FFFFFF", 16);
    var max = Math.floor(whiteHex / 3);
    var decimalStroke = Math.floor(max / (drawnCount + 1));

    var strokeString = decimalStroke.toString(16);
    if(strokeString.length < 6) {
        for(var k = 0; k < (6 - strokeString.length); k++) {
            strokeString += "8"; //some arbitrary number; 
        }
    }
    var stroke = "#" + strokeString;

    console.info("Stroke", stroke);

    var x1 = calculateLineTouchPoint(one.x, one.x + one.width, two.width, one.drawnOutEdges, one.outCount);
    one.drawnOutEdges += 1;
    var x2 = calculateLineTouchPoint(two.x, two.x + two.width, two.width, two.drawnInEdges, two.inCount);
    two.drawnInEdges += 1;

    var oneToLevelGapLineAttrs = {
        x1: x1,
        y1: one.y + one.height,
        x2: x1,
        y2: one.y + one.height + gap,
        stroke: stroke,
        "stroke-width": app.STROKE_WIDTH
    };
    drawLine(oneToLevelGapLineAttrs, svg);

    var horizontalLineAttrs = {
        x1: oneToLevelGapLineAttrs.x2,
        y1: oneToLevelGapLineAttrs.y2,
        x2: x2,
        y2: oneToLevelGapLineAttrs.y2,
        stroke: stroke,
        "stroke-width": app.STROKE_WIDTH
    };
    drawLine(horizontalLineAttrs, svg); 

    var verticalLineAttrs = {
        x1: x2,
        y1: horizontalLineAttrs.y2,
        x2: x2,
        y2: two.y - 15,
        stroke: stroke,
        "stroke-width": app.STROKE_WIDTH,
        "marker-end": "url(#Triangle)"
    };

    drawLine(verticalLineAttrs, svg);
};

var preprocessEdgesForEaseOfDrawing = function(graph, allNodes, edges) {

    var levelConceptCounts = {};
    var edgesBetweenLevelsCount = {};
    var nodesByFromCount = {}; //todo -> change from and to -> start and end
    var nodesByToCount = {};

    var levelGapTraffic = {};
    var levelAlleyTraffic = {};

    var i, length;
    length = graph.levels.length;

    for(i = 0; i < length; i++) {
        var level = graph.levels[i];
        levelConceptCounts[i] = level.length;
    };
    console.info("levelConceptCounts", levelConceptCounts);

    _.each(edges, function(e) {

        var outCount = nodesByFromCount[e.from] || 0;
        nodesByFromCount[e.from] = outCount + 1;

        var inCount = nodesByToCount[e.to] || 0;
        nodesByToCount[e.to] = inCount + 1;

        e.fromLevelIndex = allNodes[e.from].levelIndex;
        e.toLevelIndex = allNodes[e.to].levelIndex;

        var key = e.fromLevelIndex + "-" + e.toLevelIndex;
        var count = edgesBetweenLevelsCount[key] || 0;
        count += 1;
        edgesBetweenLevelsCount[key] = count;

        var levelsCrossed = [];
        for(var k = e.fromLevelIndex; k <= e.toLevelIndex; k++) {
            levelsCrossed.push(k);
        };
        var crossLength = levelsCrossed.length;
        for(var j = 0; j < crossLength - 1; j++) {
            var trafficKey = levelsCrossed[j] + "-" + levelsCrossed[j+1];
            var levelTrafficCount = levelGapTraffic[trafficKey] || 0;
            levelTrafficCount += 1;
            levelGapTraffic[trafficKey] = levelTrafficCount;
        }

        var isEqualPosition = allNodes[e.from].levelPosition === allNodes[e.to].levelPosition;
        var doLevelsHaveEqualConceptCounts = levelConceptCounts[e.fromLevelIndex] === levelConceptCounts[e.toLevelIndex];

        if( (e.toLevelIndex - e.fromLevelIndex) > 1 ) {
            e.type = app.JUMP;
        }
        else if(isEqualPosition && doLevelsHaveEqualConceptCounts) {
            e.type = app.NO_JUMP_CRISS_CROSS;
        }
        else {
            e.type = app.NO_JUMP_CRISS_CROSS;
        }

        if(e.type === app.JUMP) {
            console.debug(e.from, " at Level ", e.fromLevelIndex , " ----> ", e.to, " at Level ", e.toLevelIndex);
        }

    });

    return {
        edgesBetweenLevelsCount: edgesBetweenLevelsCount,
        edges: edges,
        nodesByFromCount: nodesByFromCount,
        nodesByToCount: nodesByToCount,
        levelGapTraffic: levelGapTraffic    
    };

};

var drawAllEdges = function(graph, inputEdges, allNodes, svg) {
    console.info("Edges: ", inputEdges);

    var preprocessResult = preprocessEdgesForEaseOfDrawing(graph, allNodes, inputEdges);
    var edges = preprocessResult.edges;
    var edgesBetweenLevelsCount = preprocessResult.edgesBetweenLevelsCount;
    var nodesByFromCount = preprocessResult.nodesByFromCount;
    var nodesByToCount = preprocessResult.nodesByToCount;

    var totalLevelGapTraffic = preprocessResult.levelGapTraffic;
    var drawnLevelGapTraffic = {};
    _.each(_.keys(totalLevelGapTraffic), function(key) {
        drawnLevelGapTraffic[key] = 0;
    });

    console.log(edges, edgesBetweenLevelsCount);

    console.info("Traffic levels. Where is Silk Board? ", totalLevelGapTraffic);
        
    var i, length;
    length = edges.length;
    var drawnEdgesBetweenLevelsCount = {};
    for(i = 0; i < length; i++) {
        var edge = edges[i];
        var one = allNodes[edge.from];
        var two = allNodes[edge.to];
        one.outCount = nodesByFromCount[edge.from];
        two.inCount = nodesByToCount[edge.to];
        if(edge.type === app.NO_JUMP_STRAIGHT) {
            drawNoJumpStraightLineBetweenOneAndTwo(one, two, svg);
        }

        else if(edge.type === app.NO_JUMP_CRISS_CROSS) {
            //#todo -> DRY the key
            var key = edge.fromLevelIndex + "-" + edge.toLevelIndex;
            var totalCount = totalLevelGapTraffic[key];
            var drawnCount = drawnLevelGapTraffic[key];
            drawNoJumpPathBetweenOneAndTwo(one, two, drawnCount, totalCount, svg);
            drawnCount += 1;
            drawnLevelGapTraffic[key] = drawnCount;
        }
    }
    
};

var drawAllNodes = function(levels, svgAttrs) {

    var i, length;
    length = levels.length;

    //#todo -> find a way to do dependency injection for levelGap instead of using global variable
    //As of now I'm trying to minimize usage of global variable by making a local copy 
    //and using the local variable everywhere else in this function, at least. 
    var levelGap = app.levelGap;
    var cumulativeLevelHeight = levelGap;

    var allNodes = {};
    for(i = 0 ; i < length; i++) {
        var level = levels[i];
        var levelNodesAndMaxHeight = drawLevelNodes(level, i, svgAttrs, cumulativeLevelHeight);
        _.extend(allNodes, levelNodesAndMaxHeight.levelNodes);
        var maxLevelHeight = levelNodesAndMaxHeight.maxHeight;
        cumulativeLevelHeight = cumulativeLevelHeight + maxLevelHeight + levelGap;
    };
    return allNodes;
};


var init = function() {
    
    //cache the width so that it can used be in calculations without querying the dom each time.
    var svg = $("svg");
    
    svg.find("foreignObject").remove();
    svg.find("line").remove();


    var svgAttrs = {
        svg: svg,
        width: svg[0].offsetWidth
    };

    app.allNodes = drawAllNodes(graph.levels, svgAttrs);
    drawAllEdges(graph, graph.edges, app.allNodes, svg);

    //testDrawLine(svg);
};


$(document).ready(init);

//window.onresize = init;

