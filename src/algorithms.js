var CMap = CMap || {};

function getRandomInt(min,max)
{
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

CMap.randomExcursion = function(numberSteps)
{
	var walk = [0];
	for(var p=numberSteps,q=numberSteps;p>0||q>0;)
	{
		if( getRandomInt(0,(q+p)*(q-p+1)-1) < (q+1)*(q-p) )
		{
			q--;
		} else
		{
			p--;
		}
		walk.push(q-p);
	}
	return walk;
}

CMap.graphDistance = function(planarmap,startNode,label){
	"use strict";
	label = defaultFor(label,"distance");
	planarmap.nodes().forEach(function(node){
		node.attr[label] = -1;
	});
	startNode.attr[label] = 0;
	var queue = [startNode];
	while( queue.length > 0 )
	{
		var curNode = queue[0];
		queue.shift();
		curNode.edges.forEach(function(edge){
			if( edge.end().attr[label] == -1 )
			{
				edge.end().attr[label] = 1+curNode.attr[label];
				queue.push(edge.end());
			}			
		});
	}
}
CMap.dualGraphDistance = function(planarmap,startFace,label){
	"use strict";
	label = defaultFor(label,"distance");
	planarmap.faces().forEach(function(face){
		face.attr[label] = -1;
	});
	startFace.attr[label] = 0;
	var queue = [startFace];
	while( queue.length > 0 )
	{
		var curFace = queue[0];
		queue.shift();
		curFace.edges.forEach(function(edge){
			if( edge.right().attr[label] == -1 )
			{
				edge.right().attr[label] = 1+curFace.attr[label];
				queue.push(edge.right());
			}			
		});
	}
}

CMap.steppedAlgorithm = function(){
	"use strict";
	this.steps = [];
	this.index = 0;
}
CMap.steppedAlgorithm.prototype.runAll = function(){
	var done = false;
	while( !done )
	{
		done = this.runNext();
	}
}
CMap.steppedAlgorithm.prototype.runNext = function(){
	var repeat = this.steps[this.index].call(this);
	if( repeat === undefined || repeat === false )
	{
		this.index++;
	}
	return this.index >= this.steps.length;
}
CMap.steppedAlgorithm.prototype.done = function(){
	return this.index >= this.steps.length;
}
CMap.steppedAlgorithm.prototype.push = function(fun){
	this.steps.push(fun);
}

CMap.SchaefferBijection = function(planarmap,label){
	"use strict";
	if( !planarmap.faces().every(function(face){
		return face.edges.length == 4;
	}) ) {
		throw "Planar map is not a quadrangulation";
	}
	if( !planarmap.edges().every(function(edge){
		return isFinite(edge.start.attr[label]) && isFinite(edge.end.attr[label])
			&& Math.abs(edge.start.attr[label]-edge.end.attr[label]) == 1;
	}) ){
		throw "Improper labeling";
	}

	var algorithm = new CMap.steppedAlgorithm();
	algorithm.label = label;
	algorithm.planarmap = planarmap;
	planarmap.edges().forEach(function(edge){
		edge.attr.bijectionstatus = "old";
	});
	
	planarmap.faces().forEach(function(face){
		var algo = algorithm;
		var labels = face.edges.map(function(edge){
			return edge.start().attr[algo.label];
		});
		var max = labels[0],
			min = labels[0],
			maxpos = 0,
			minpos = 0;
		labels.forEach(function(x,i){
			if( x < min ) { min = x; minpos = i; }
			if( x > max ) { max = x; maxpos = i; }
		});
		
		if( max == min + 1 ){
			// confluent face -> insert diagonal
			algorithm.push(function(){
				var diagonal = this.planarmap.insertDiagonal(face,
					[maxpos,(maxpos+2)%4]);
				diagonal.attr.bijectionstatus = "new";
			})
		} else
		{
			// simple face -> add edge parallel to increasing edge
			algorithm.push(function(){
				var diagonal = this.planarmap.insertDiagonal(face,
					[(maxpos+3)%4,maxpos]);
				diagonal.attr.bijectionstatus = "new";
			})		
		}
		
	});
	

	planarmap.edges().forEach(function(edge){
		algorithm.push(function(){
			this.planarmap.removeEdge(edge);
		})
	});
	
	return algorithm;
}

CMap.inverseSchaefferBijection = function(planarmap,label){
	"use strict";
	if( !planarmap.edges().every(function(edge){
		return isFinite(edge.start.attr[label]) && isFinite(edge.end.attr[label])
			&& Math.abs(edge.start.attr[label]-edge.end.attr[label]) <= 1;
	}) ){
		throw "Improper labeling";
	}

	var algorithm = new CMap.steppedAlgorithm();
	algorithm.label = label;
	algorithm.planarmap = planarmap;
	planarmap.edges().forEach(function(edge){
		edge.attr.bijectionstatus = "old";
	});
	
	planarmap.faces().forEach(function(face){
		var algo = algorithm;
		var min = "-inf", minEdge;
		face.edges.forEach(function(edge){
			if( min === "-inf" || edge.start().attr[algo.label] < min )
			{
				min = edge.start().attr[algo.label];
				minEdge = edge;
			}
		});
		algorithm.push(function(){
			var newnode = this.planarmap.insertEdgeNextTo(minEdge).end;
			newnode.attr[this.label] = min - 1;
			newnode.edges[0].edge.attr.bijectionstatus = "new";
		});
		face.edges.forEach(function(edge){
			if( edge != minEdge ){
				algorithm.push(function(){
					var targetEdge = edge;
					while( targetEdge.start().attr[this.label] != 
						edge.start().attr[this.label] - 1 ){
						targetEdge = targetEdge.next();
					}
					var diagonal = this.planarmap.insertDiagonal(edge.left(),
						[edge,targetEdge]);
					diagonal.attr.bijectionstatus = "new";
				});
			}	
		});
	});

	planarmap.edges().forEach(function(edge){
		algorithm.push(function(){
			this.planarmap.removeEdge(edge);
		})
	});
	
	return algorithm;
}

CMap.growRandomTree = function(planarmap,rootEdge,numEdges){
	"use strict";
	var algorithm = new CMap.steppedAlgorithm();
	algorithm.planarmap = planarmap;
	algorithm.curEdge = rootEdge;
	algorithm.walk = CMap.randomExcursion(numEdges);
	algorithm.walkindex = 1;
	for(var i=0;i<numEdges;i++)
	{
		algorithm.push(function(){
			while( this.walk[this.walkindex] < this.walk[this.walkindex-1] )
			{
				this.curEdge = this.curEdge.next();
				this.walkindex++;
			}
			this.curEdge = this.planarmap.insertEdgeNextTo(
				this.curEdge.next()).getOriented();
			this.walkindex++;
		});
	}
	return algorithm;
}

CMap.randomTreeLabeling = function(planarmap,label){
	"use strict";
	var increment = {};
	planarmap.edges().forEach(function(e){
		increment[e.uid] = randomElement([-1,0,1]);
	});
	planarmap.nodes().forEach(function(node){
		node.attr[label] = "unset";
	});
	var startNode = planarmap.nodes().random();
	startNode.attr[label] = 0;
	var queue = [startNode];
	while( queue.length > 0 )
	{
		var curNode = queue[0];
		queue.shift();
		curNode.edges.forEach(function(edge){
			if( edge.end().attr[label] == "unset" )
			{
				edge.end().attr[label] = curNode.attr[label] + increment[edge.edge.uid];
				queue.push(edge.end());
			}			
		});
	}
	var min = 0;
	planarmap.nodes().forEach(function(node){
		if( min > node.attr[label] ) min = node.attr[label];
	});
	planarmap.nodes().forEach(function(node){
		node.attr[label] += 1 - min;
	});
}

// Build a planar map with the required adjacency.
// Arguments:
//  * planarmap: a PlanarMap object assumed to be a single edge map
//  * adjlist: a three-dimensional array with entries
//    adjlist[i][j] = [k,l] meaning that the j'th edge (in ccw order)
//    of the i'th node corresponds to the l'th edge of the k'th node.
//  * startnode (optional): the id of the central node.
//  * outerfacepath (optional): a two-dimensional array representing
//    a path in the dual map from the corner to the left of the first
//    edge of the central node to the 
//    outer face, with entries outerfacepath[p] = [i,j] meaning that
//    the p'th segment of the path crosses the j'th edge of the i'th node
//    coming from the right. 
//  * idlabel (optional): a string representing the label in which 
//    the ids from adjlist will be stored, i.e. the node n corresponding
//    to the i'th entry in adjlist will have n.attr[idlabel] == i.
CMap.buildMapFromAdjacencyList = function(planarmap,adjlist,startnode,
									 outerfacepath,idlabel){
	"use strict";
	var crossinglabel = "crossing";
	idlabel = defaultFor(idlabel,"id");
	startnode = defaultFor(startnode,0);
	var outerfacepathcrossing = adjlist.map(function(a){ 
		return a.map(function(){ return 0; });
	});
	if( outerfacepath !== undefined )
	{
		outerfacepath.forEach(function(p){
			outerfacepathcrossing[p[0]][p[1]] += 1;
			outerfacepathcrossing[ adjlist[p[0]][p[1]][0] ]
				[ adjlist[p[0]][p[1]][1] ] -= 1;
		});
	}

	var labeltonode = adjlist.map(function(){return 0;});	
	var startEdge = planarmap.edges().random().getOriented();
	labeltonode[startnode] = startEdge.start();
	startEdge.start().attr[idlabel] = startnode;

	var adjtoedge = adjlist.map(function(a){
		return a.map(function(){ return 0; });
	});
	var entrydir = adjlist.map(function(){return 0;});
	var queue = [startnode];

	function processEdge(i,j,edge)
	{
		adjtoedge[i][j] = edge.getOriented();
		adjtoedge[adjlist[i][j][0]][adjlist[i][j][1]] = edge.getOriented(true);
		edge.attr[crossinglabel] = outerfacepathcrossing[i][j];
	}

	if( adjlist[startnode][0][0] == startnode )
	{
		// have to replace the single edge map by a single loop
		var loopedge = planarmap.insertDiagonal(startEdge.left(),
			[startEdge,startEdge]);
		planarmap.removeEdge(startEdge);
		startEdge = loopedge.getOriented();
		processEdge(startnode,0,loopedge);
	} else
	{
		var firstnbr = adjlist[startnode][0][0];
		labeltonode[firstnbr] = startEdge.end();
		startEdge.end().attr[idlabel] = firstnbr;
		processEdge(startnode,0,startEdge.edge);
		queue.push(firstnbr);
		entrydir[firstnbr] = adjlist[startnode][0][1];
	}
	
	var algorithm = new CMap.steppedAlgorithm();
	
	var edgetotherightofcurdir = startEdge;
	var currentdirection = 0;
	function nextDirection() {
		while( queue.length > 0 )
		{
			do {
				if( currentdirection !== entrydir[queue[0]] )
				{
					edgetotherightofcurdir = edgetotherightofcurdir.prev()
						.reverse();
				}
				currentdirection = (currentdirection+1)
					% adjlist[queue[0]].length;
				if( adjtoedge[queue[0]][currentdirection] === 0 )
					return true;
			} while( currentdirection !== entrydir[queue[0]] );
			queue.shift();
			if( queue.length > 0 )
			{
				currentdirection = entrydir[queue[0]];
				edgetotherightofcurdir = adjtoedge[queue[0]][currentdirection];
			}
		}
		return false;
	}
	
	if( nextDirection() )
	{
		algorithm.push(function(){
			var fromnode = labeltonode[queue[0]];
			var tonodelabel = adjlist[queue[0]][currentdirection][0];
			var newedge;
			if( labeltonode[tonodelabel] === 0 )
			{
				// edge to new node
				newedge = planarmap.insertEdgeNextTo(
					edgetotherightofcurdir);
				labeltonode[tonodelabel] = newedge.end;
				newedge.end.attr[idlabel] = tonodelabel;
				entrydir[tonodelabel] = adjlist[queue[0]][currentdirection][1];
				queue.push(tonodelabel);
			}else
			{
				// edge to existing node
				var tocorner = edgetotherightofcurdir;
				var crossing = 0;
				while( tocorner.start().attr[idlabel] !== tonodelabel )
				{
					tocorner = tocorner.prev();
					crossing -= tocorner.edge.attr[crossinglabel]
						* (tocorner.reversed ? -1 : 1 );
					if( tocorner.isEqual(startEdge) )
						crossing -= 1;
				} 
				var comment = {};
				if( outerfacepath !== undefined 
					&& tocorner.left().layout.outer )
				{
					if( crossing === outerfacepathcrossing[queue[0]][currentdirection] )
					{
						comment.outer = "right";
					} else 
					{
						comment.outer = "left";
					}
				}
				newedge = planarmap.insertDiagonal( tocorner.left(),
					[edgetotherightofcurdir,tocorner],comment);
			}	
			processEdge(queue[0],currentdirection,newedge);
			return nextDirection();
		});
	}
	return algorithm;
}

// Apply facefunction to each face that is enclosed in cw direction
// by the boundary, which is a sequence of oriented edges in planarmap
CMap.applyToDisk = function(planarmap,boundary,facefunction) {
	var visited = {};
	var inboundary = {};
	boundary.forEach(function(e){ inboundary[e.edge.uid] = true; });
	var queue = [];
	boundary.forEach(function(edge){
		if( !boundary.some(function(e){ return e.isReverse(edge); }) )
		{
			var face = edge.right();
			if( !(face.uid in visited) )
			{
				visited[face.uid] = true;
				queue.push(face);
			}
		}
	});
	while( queue.length > 0 )
	{
		var face = queue[0];
		queue.shift();
		facefunction(face);
		face.edges.forEach(function(edge){
			if( !(edge.edge.uid in inboundary) && 
				!(edge.right().uid in visited) )
			{
				visited[edge.right().uid] = true;
				queue.push(edge.right());
			}
		})
	}
} 
