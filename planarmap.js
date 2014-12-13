function defaultFor(arg, val) { return typeof arg !== 'undefined' ? arg : val; }
function arrayPairs(arr) {
	var pairs = [];
	for(var i=0;i<arr.length;i++)
	{
		pairs.push([arr[i],arr[(i+1)%arr.length]]);
	}
	return pairs;
}

var CMap = CMap || {};

CMap.Face = function (){
	"use strict";
	// array of references to OrientedEdges e
	// for which e.left == this in ccw order.
	this.edges = [];
	this.attr = {};
}
CMap.Face.prototype.clear = function() {
	while(this.edges.length > 0){
		this.edges.pop();
	}
}
CMap.Face.prototype.edgeIndex = function(orientededge) {
	for(var i=0;i<this.edges.length;i++)
	{
		if( this.edges[i].edge == orientededge.edge 
			&& this.edges[i].reversed == orientededge.reversed )
		{
			return i;
		}
	}
	return -1;
}
CMap.Face.prototype.insertEdgeBefore = function(oldedge) {
	var index = this.edgeIndex(oldedge);
	for( var i=arguments.length-1;i>=1;i--)
	{
		this.edges.splice(index,0,arguments[i]);
	}
}

CMap.OrientedEdge = function(edge,reversed){
	"use strict";
	reversed = defaultFor(reversed,false);
	this.edge = edge;
	this.reversed = reversed;

}
CMap.OrientedEdge.prototype.end = function(){
	if( arguments.length > 0 )
	{
		if( this.reversed ) this.edge.start = arguments[0];
		else this.edge.end = arguments[0];
		return this;
	} else
		return this.reversed ? this.edge.start : this.edge.end;
}
CMap.OrientedEdge.prototype.start = function(){
	if( arguments.length > 0 )
	{
		if( this.reversed ) this.edge.end = arguments[0];
		else this.edge.start = arguments[0];
		return this;
	} else
		return this.reversed ? this.edge.end : this.edge.start;
}
CMap.OrientedEdge.prototype.left = function(){
	if( arguments.length > 0 )
	{
		if( this.reversed ) this.edge.right = arguments[0];
		else this.edge.left = arguments[0];
		return this;
	} else
		return this.reversed ? this.edge.right : this.edge.left;
}
CMap.OrientedEdge.prototype.right = function(){
	if( arguments.length > 0 )
	{
		if( this.reversed ) this.edge.left = arguments[0];
		else this.edge.right = arguments[0];
		return this;
	} else
		return this.reversed ? this.edge.left : this.edge.right;
}
CMap.OrientedEdge.prototype.clear = function(){
	this.edge = null;
}
CMap.OrientedEdge.prototype.next = function(){
	var index = this.left().edgeIndex(this);
	return this.left().edges[(index+1)%this.left().edges.length];
}
CMap.OrientedEdge.prototype.prev = function(){
	var index = this.left().edgeIndex(this)-1;
	if( index < 0 ) index = this.left().edges.length;
	return this.left().edges[index];
}
CMap.OrientedEdge.prototype.reverse = function(){
	return new CMap.OrientedEdge(this.edge,!this.reversed);
}

CMap.Node = function (){
	"use strict";
	// array of references to OrientedEdges e
	// for which e.start == this in ccw order.
	this.edges = [];
	this.attr = {};
	this.pos = new Vec2(0,0);
}
CMap.Node.prototype.clear = function(){
	while(this.edges.length > 0){
		this.edges.pop();
	}
}
CMap.Node.prototype.edgeIndex = function(orientededge) {
	for(var i=0;i<this.edges.length;i++)
	{
		if( this.edges[i].edge == orientededge.edge 
			&& this.edges[i].reversed == orientededge.reversed )
		{
			return i;
		}
	}
	return -1;
}
CMap.Node.prototype.insertEdgeBefore = function(oldedge) {
	var index = this.edgeIndex(oldedge);
	for( var i=arguments.length-1;i>=1;i--)
	{
		this.edges.splice(index,0,arguments[i]);
	}
}

CMap.Edge = function (start,end,left,right){
	this.start = start;
	this.end = end;
	this.left = left;
	this.right = right;
	this.attr = {};
	this.layout = {};
}
CMap.Edge.prototype.clear = function(){
	this.start = null;
	this.end = null;
	this.left = null;
	this.right = null;
}
CMap.Edge.prototype.getOriented = function(reversed){
	reversed = defaultFor(reversed,false);
	return new CMap.OrientedEdge(this,reversed);
}


CMap.UIdContainer = function (prefix){
	"use strict";
	prefix = defaultFor(prefix,"");
	var container = {};
	var newUId = 0;
	var data = {};
	
	container.insert = function(entry){
		var uid = prefix + newUId;
		newUId++; 
		data[uid] = entry;
		entry.uid = uid;
		return entry;
	}
	container.get = function(uid){
		return data[uid];
	}
	container.remove = function(entry,clearfirst){
		clearfirst = defaultFor(clearfirst,true);
		var uid;
		if( typeof entry == 'string' || entry instanceof String )
		{
			uid = entry;
		}else
		{
			uid = entry.uid;
		}
		if( uid in data )
		{
			if( clearfirst && clear in data[uid] )
			{
				data[uid].clear();
			}
			delete data[uid];
		} else
		{
			throw "No such entry exists.";
		}
		return container;
	}
	container.data = function(){
		return data;
	}
	container.clear = function(clearfirst){
		clearfirst = defaultFor(clearfirst,true);
		for( var uid in data ){
			if( clear in data[uid] )
			{
				data[uid].clear();
			}
			delete data[uid];
		}
		return container;
	}
	container.every = function(f){
		for( var id in data )
		{
			if( !f(data[id]) )
			{
				return false;
			}
		}
		return true;
	}
	container.some = function(f){
		for( var id in data )
		{
			if( f(data[id]) )
			{
				return true;
			}
		}
		return false;
	}
	container.forEach = function(f){
		for( var id in data )
		{
			f(data[id]);
		}
	}
	return container;
}

CMap.PlanarMap = function (){
	"use strict";
	
	var planarmap = {}; // Object which is returned
	var nodes = CMap.UIdContainer("node");
	var edges = CMap.UIdContainer("edge");
	var faces = CMap.UIdContainer("face");
	var outerface;
	var onChange = {};

	function doOnChange(type,fun){
		if( onChange[type] )
		{
			onChange[type].forEach(function(f){fun(f);});
		}
	}
	planarmap.nodes = function(){
		return nodes;
	}
	planarmap.edges = function(){
		return edges;
	}
	planarmap.faces = function(){
		return faces;
	}
	planarmap.outerface = function(){
		return outerface;
	}
	planarmap.newNode = function(){
		return nodes.insert(new CMap.Node());
	}
	planarmap.newEdge = function(start,end,left,right){
		return edges.insert(new CMap.Edge(start,end,left,right));
	}
	planarmap.newFace = function(){
		return faces.insert(new CMap.Face());
	}
	planarmap.onChange = function(type,callback){
		if( !(type in on) )
		{
			onChange[type] = [];
		}
		onChange[type].push(callback);
	}
	planarmap.singleEdgeMap = function(){
		nodes.clear();
		edges.clear();
		faces.clear();
		var node1 = planarmap.newNode(),
			node2 = planarmap.newNode(),
			face = planarmap.newFace(),
			edge = planarmap.newEdge(node1,node2,face,face);
		face.edges.push(edge.getOriented(false),edge.getOriented(true));
		node1.edges.push(edge.getOriented(false));
		node2.edges.push(edge.getOriented(true));
		face.outer = true;
		outerface = face;

		doOnChange("singleEdgeMap",function(f){f(edge);});
		return planarmap;
	}
	/* Add edge starting at the corner to the left of the
	 * start of orientededge and ending at a new node. 
	 */ 
	planarmap.insertEdgeBefore = function(orientededge){
		var endnode = planarmap.newNode();
		var face = orientededge.left();
		var startnode = orientededge.start();
		var edge = planarmap.newEdge(startnode,endnode,face,face);
		endnode.edges.push(edge.getOriented(true));
		startnode.insertEdgeBefore(orientededge,
			edge.getOriented(false));
		face.insertEdgeBefore(orientededge,
			edge.getOriented(false),
			edge.getOriented(true));
		doOnChange("insertEdgeBefore",function(f){f(edge);});
		return edge;
	}
	planarmap.insertDiagonal = function(face,indices){
		var startnode = face.edges[indices[0]].start(),
			endnode = face.edges[indices[1]].start();
		var newface = planarmap.newFace();
		var edge = planarmap.newEdge(startnode,endnode,face,newface);
		startnode.insertEdgeBefore(face.edges[indices[0]],
			edge.getOriented(false));
		endnode.insertEdgeBefore(face.edges[indices[1]],
			edge.getOriented(true));
		if( indices[0] <= indices[1] )
		{
			newface.edges = face.edges.splice(indices[0],
				indices[1]-indices[0]);
			face.edges.splice(indices[0],0,edge.getOriented());
			newface.edges.push(edge.getOriented(true));
		}else
		{
			newface.edges = face.edges.splice(indices[0],
				face.edges.length - indices[0] + 1)
				.concat(face.edges.splice(0,indices[1]));
			face.edges.splice(indices[1],0,edge.getOriented());
			newface.edges.push(edge.getOriented(true));			
		}
		newface.edges.forEach(function(e){
			e.left(newface);
		});
		doOnChange("insertDiagonal",function(f){f(edge);});
		return edge;
	}
	planarmap.checkIncidence = function(){
		if( !nodes.every(function(n){
			return n.edges.every(function(e){return e.start() == n;});
		}))
		{
			return false;
		}
		if( !nodes.every(function(n){
			return arrayPairs(n.edges).every(function(p){
				return p[0].left() == p[1].right();
			});
		}))
		{
			return false;
		}
		if( !faces.every(function(f){
			return f.edges.every(function(e){return e.left() == f;});
		}))
		{
			return false;
		}
		if( !faces.every(function(f){
			return arrayPairs(f.edges).every(function(p){
				return p[0].end() == p[1].start();
			});
		}))
		{
			return false;
		}
		return true;
	}
	return planarmap;
};
