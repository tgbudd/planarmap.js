function defaultFor(arg, val) { return typeof arg !== 'undefined' ? arg : val; }
function arrayPairs(arr) {
	var pairs = [];
	for(var i=0;i<arr.length;i++)
	{
		pairs.push([arr[i],arr[(i+1)%arr.length]]);
	}
	return pairs;
}

function randomElement(arr)
{
	return arr[Math.floor(Math.random()*arr.length)];
}

var CMap = CMap || {};

CMap.Face = function (){
	"use strict";
	// array of references to OrientedEdges e
	// for which e.left == this in ccw order.
	this.edges = [];
	this.attr = {};
	this.layout = {};
	this.class = {"face":true};
}
CMap.Face.prototype.fromJSON = function(){
	this.edges.forEach(function(e) {
		e.__proto__ = CMap.OrientedEdge.prototype;
	});
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
CMap.Face.prototype.copy = function() {
	var face = new CMap.Face();
	face.edges = this.edges.map(function(e){
		return new CMap.OrientedEdge(e.edge,e.reversed);
	});
	for( key in this.attr )
	{
		if( this.attr.hasOwnProperty(key) )
		{
			face.attr[key] = this.attr[key];
		}
	}
	return face;
}
CMap.Face.prototype.updateReferences = function(dict) {
	this.edges.forEach(function(e){
		e.edge = dict[ e.edge instanceof CMap.Edge ? e.edge.uid : e.edge ];
	});	
}
CMap.Face.prototype.removeEdge = function(orientededge) {
	var index = this.edgeIndex(orientededge);
	if( index == -1 )
	{
		throw "Edge not found";
	}
	this.edges.splice(index,1);
}

CMap.OrientedEdge = function(edge,reversed){
	"use strict";
	reversed = defaultFor(reversed,false);
	this.edge = edge;
	this.reversed = reversed;

}
CMap.OrientedEdge.prototype.toJSON = function(){
	return {
		edge: this.edge.uid,
		reversed: this.reversed
	};
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
	if( index < 0 ) index = this.left().edges.length-1;
	return this.left().edges[index];
}
CMap.OrientedEdge.prototype.reverse = function(){
	return new CMap.OrientedEdge(this.edge,!this.reversed);
}
CMap.OrientedEdge.prototype.isEqual = function(oredge){
	return this.edge == oredge.edge && this.reversed == oredge.reversed;
}
CMap.OrientedEdge.prototype.isReverse = function(oredge){
	return this.edge == oredge.edge && this.reversed != oredge.reversed;
}

CMap.Node = function (){
	"use strict";
	// array of references to OrientedEdges e
	// for which e.start == this in ccw order.
	this.edges = [];
	this.attr = {};
	this.class = {"node":true};
	this.pos = new Vec2(0,0);
}
CMap.Node.prototype.fromJSON = function(){
	this.edges.forEach(function(e) {
		e.__proto__ = CMap.OrientedEdge.prototype;
	});
	this.pos = new Vec2(this.pos.x,this.pos.y);
}
CMap.Node.prototype.toJSON = function(){
	return { 
		edges:this.edges,
		attr:this.attr,
		class:this.class,
		pos:this.pos
	};
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
CMap.Node.prototype.insertEdgeAfter = function(oldedge) {
	var index = this.edgeIndex(oldedge);
	for( var i=arguments.length-1;i>=1;i--)
	{
		this.edges.splice(index+1,0,arguments[i]);
	}
}
CMap.Node.prototype.copy = function() {
	var node = new CMap.Node();
	node.edges = this.edges.map(function(e){
		return new CMap.OrientedEdge(e.edge,e.reversed);
	});
	for( key in this.attr )
	{
		if( this.attr.hasOwnProperty(key) )
		{
			node.attr[key] = this.attr[key];
		}
	}
	return node;
}
CMap.Node.prototype.updateReferences = function(dict) {
	this.edges.forEach(function(e){
		e.edge = dict[ e.edge instanceof CMap.Edge ? e.edge.uid : e.edge ];
	});	
}
CMap.Node.prototype.removeEdge = function(orientededge) {
	var index = this.edgeIndex(orientededge);
	if( index == -1 )
	{
		throw "Edge not found";
	}
	this.edges.splice(index,1);
}

CMap.Edge = function (start,end,left,right){
	this.start = start;
	this.end = end;
	this.left = left;
	this.right = right;
	this.attr = {};
	this.layout = {vert: []};
	this.class = {"edge":true};
}
CMap.Edge.prototype.fromJSON = function(){
	this.layout.__proto__ = CMap.EdgeLayout.prototype;
	if( this.layout.fromJSON !== undefined )
	{
		this.layout.fromJSON();
	}
}
CMap.Edge.prototype.toJSON = function(){
	return {
		start: this.start.uid,
		end: this.end.uid,
		left: this.left.uid,
		right: this.right.uid,
		attr: this.attr,
		layout: this.layout,
		class: this.class
	};
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
CMap.Edge.prototype.copy = function() {
	var edge = new CMap.Edge(this.start,this.end,this.left,this.right);
	for( key in this.attr )
	{
		if( this.attr.hasOwnProperty(key) )
		{
			edge.attr[key] = this.attr[key];
		}
	}
	return edge;
}
CMap.Edge.prototype.updateReferences = function(dict) {
	this.start = dict[ this.start instanceof CMap.Node ? this.start.uid : this.start ];
	this.end = dict[ this.end instanceof CMap.Node ? this.end.uid : this.end ];
	this.left = dict[ this.left instanceof CMap.Face ? this.left.uid : this.left ];
	this.right = dict[ this.right instanceof CMap.Face ? this.right.uid : this.right ];
}

CMap.UIdContainer = function (prefix){
	"use strict";
	prefix = defaultFor(prefix,"");
	var container = {};
	var newUId = 0;
	var data = {};
	var size = 0;
	
	container.insert = function(entry){
		var uid = prefix + newUId;
		newUId++; 
		size++;
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
			if( clearfirst && "clear" in data[uid] )
			{
				data[uid].clear();
			}
			delete data[uid];
			size--;
		} else
		{
			throw "No such entry exists.";
		}
		return container;
	}
	container.data = function(){
		return data;
	}
	container.array = function(){
		var arr = [];
		container.forEach(function(d){arr.push(d)});
		return arr;
	}
	container.clear = function(clearfirst){
		clearfirst = defaultFor(clearfirst,true);
		for( var uid in data ){
			if( "clear" in data[uid] )
			{
				data[uid].clear();
			}
			delete data[uid];
		}
		size = 0;
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
	container.select = function(f){
		for( var id in data )
		{
			if( f(data[id]) )
			{
				return data[id];
			}
		}
	}
	container.map = function(f){
		var arr = [];
		container.forEach(function(d){
			arr.push(f(d));
		});
		return arr;
	}
	container.total = function(f){
		var tot=0;
		for( var id in data )
		{
			tot += f(data[id]);
		}
		return tot;
	}
	container.size = function(){
		return size;
	}
	container.random = function(){
		return randomElement(container.array());
	}
	container.toJSON = function(){
		return {
			prefix: prefix,
			newUId: newUId,
			size: size,
			data: data
		};
	}
	container.fromJSON = function(json,proto){
		prefix = json.prefix;
		newUId = json.newUId;
		size = json.size;
		data = json.data;
		for( var uid in data )
		{
			data[uid].uid = uid;
		}
		if( proto !== undefined )
		{
			this.forEach(function(d){ 
				d.__proto__ = proto;
				if( d.fromJSON !== undefined )
				{
					d.fromJSON();
				}
			});
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
		if( type in onChange )
		{
			onChange[type].forEach(function(f){fun(f);});
		}
	}
	planarmap.numNodes = function(){
		return nodes.size();
	}
	planarmap.nodes = function(){
		return nodes;
	}
	planarmap.edges = function(){
		return edges;
	}
	planarmap.numEdges = function(){
		return edges.size();
	}
	planarmap.faces = function(){
		return faces;
	}
	planarmap.numFaces = function(){
		return faces.size();
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
		if( !(type in onChange) )
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
		face.layout.outer = true;
		outerface = face;

		doOnChange("singleEdgeMap",function(f){f(edge);});
		return planarmap;
	}
	/* Add edge starting at the corner to the left of the
	 * start of orientededge and ending at a new node. 
	 */ 
	planarmap.insertEdgeNextTo = function(orientededge){
		var endnode = planarmap.newNode();
		var face = orientededge.left();
		var startnode = orientededge.start();
		var edge = planarmap.newEdge(startnode,endnode,face,face);
		endnode.edges.push(edge.getOriented(true));
		startnode.insertEdgeAfter(orientededge,
			edge.getOriented(false));
		face.insertEdgeBefore(orientededge,
			edge.getOriented(false),
			edge.getOriented(true));
		doOnChange("insertEdgeNextTo",function(f){f(edge.getOriented());});
		return edge;
	}
	planarmap.insertDiagonal = function(face,corners,comments){
		var indices = corners.map(function(ind){
			if( ind instanceof CMap.OrientedEdge )
			{
				return face.edgeIndex(ind);
			}
			return ind;
		});
		var startnode = face.edges[indices[0]].start(),
			endnode = face.edges[indices[1]].start();
		var newface = planarmap.newFace();
		var edge = planarmap.newEdge(startnode,endnode,face,newface);
		startnode.insertEdgeAfter(face.edges[indices[0]],
			edge.getOriented(false));
		endnode.insertEdgeAfter(face.edges[indices[1]],
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
				face.edges.length - indices[0])
				.concat(face.edges.splice(0,indices[1]));
			face.edges.push(edge.getOriented());
			newface.edges.push(edge.getOriented(true));			
		}
		newface.edges.forEach(function(e){
			e.left(newface);
		});
		doOnChange("insertDiagonal",function(f){f(edge,comments);});
		return edge;
	}
	planarmap.splitEdge = function(orientededge){
		var newnode = planarmap.newNode();
		var newedge = planarmap.newEdge(newnode,orientededge.end(),
			orientededge.left(),orientededge.right());
		orientededge.left().insertEdgeBefore(orientededge.next(),
			newedge.getOriented());
		orientededge.right().insertEdgeBefore(orientededge.reverse(),
			newedge.getOriented(true));
		orientededge.end(newnode);
		newnode.edges.push(orientededge.reverse());
		newnode.edges.push(newedge.getOriented());
		newedge.end.edges[newedge.end.edgeIndex(orientededge.reverse())]
			= newedge.getOriented(true);
		doOnChange("splitEdge",function(f){f(newnode);});
		return newnode;
	}
	planarmap.removeEdge = function(edge){
		// Only allow if edge is dangling or if it separates
		// two distinct faces
		if( (edge.start.edges.length > 1 && edge.end.edges.length > 1
			&& edge.left == edge.right) || planarmap.numEdges() == 1 )
		{
			throw "edge removal not allowed";
		}
		var data = {"cornerEdge": edge.getOriented(true).next()};
		if( edge.left == edge.right )
		{
			// oriented edge pointing in dangling direction
			var oredge = edge.getOriented(edge.start.edges.length == 1);
			oredge.start().removeEdge(oredge);
			oredge.left().removeEdge(oredge);
			oredge.left().removeEdge(oredge.reverse());
			planarmap.nodes().remove(oredge.end());
			planarmap.edges().remove(edge);
			data["wasDangling"] = true;
		} else
		{
			// join faces
			var leftface = edge.left;
			var rightface = edge.right;
			var leftindex = leftface.edgeIndex(edge.getOriented());
			var rightindex = rightface.edgeIndex(edge.getOriented(true));
			// remove references from nodes
			edge.start.removeEdge(edge.getOriented());
			edge.end.removeEdge(edge.getOriented(true));
			// make leftface the left of the edges of rightface 
			rightface.edges.forEach(function(e){
				e.left(leftface)
			});
			// replace edge in leftface.edges by the edges in the right face
			Array.prototype.splice.apply(leftface.edges,[leftindex,1]
				.concat(rightface.edges.slice(rightindex+1))
				.concat(rightface.edges.slice(0,rightindex)));
			planarmap.faces().remove(rightface);
			planarmap.edges().remove(edge);
			data["wasDangling"] = false;
			data["oldFace"] = rightface;
		}
		doOnChange("removeEdge",function(f){f(data);});
		return planarmap;
	}
	planarmap.checkIncidence = function(){
		if( !nodes.every(function(n){
			return n.edges.every(function(e){
				if( e.start() != n )
				{
					console.log( "node incidence error", e, n);
				}
				return e.start() == n;});
		}))
		{
			return false;
		}
		if( !nodes.every(function(n){
			return arrayPairs(n.edges).every(function(p){
				if( p[0].left() != p[1].right())
				{
					console.log( "node error", n, p[0], p[1]);
				}
				return p[0].left() == p[1].right();
			});
		}))
		{
			return false;
		}
		if( !faces.every(function(f){
			return f.edges.every(function(e){
				if( e.left() != f )
				{
					console.log( "face incidence error", e, f );
				}
				return e.left() == f;});
		}))
		{
			return false;
		}
		if( !faces.every(function(f){
			return arrayPairs(f.edges).every(function(p){
				if(p[0].end() != p[1].start() )
				{
					console.log( "face error", f, p[0], p[1] );
				}
				return p[0].end() == p[1].start();
			});
		}))
		{
			return false;
		}
		return true;
	}
	function getDictionary(){
		var dict = {};
		nodes.forEach(function(n){
			dict[n.uid] = n;
		});
		edges.forEach(function(e){
			dict[e.uid] = e;
		});
		faces.forEach(function(f){
			dict[f.uid] = f;
		});		
		return dict;
	}
	planarmap.deepCopy = function(){
		var map = CMap.PlanarMap();
		var dict = {};
		nodes.forEach(function(n){
			var node = n.copy();
			map.nodes().insert(node);
			dict[n.uid] = node;
		});
		edges.forEach(function(e){
			var edge = e.copy();
			map.edges().insert(edge);
			dict[e.uid] = edge;
		});
		faces.forEach(function(f){
			var face = f.copy();
			map.faces().insert(face);
			dict[f.uid] = face;
		});
		map.nodes().forEach(function(n){
			n.updateReferences(dict);
		});
		map.edges().forEach(function(e){
			e.updateReferences(dict);
		});
		map.faces().forEach(function(f){
			f.updateReferences(dict);
		});
		return map;
	}
	planarmap.toJSON = function(){
		return {
			nodes: nodes,
			edges: edges,
			faces: faces,
			outerface: outerface.uid
		};
	}
	planarmap.fromJSON = function(json){
		nodes.fromJSON(json.nodes,CMap.Node.prototype);
		edges.fromJSON(json.edges,CMap.Edge.prototype);
		faces.fromJSON(json.faces,CMap.Face.prototype);
		var dict = getDictionary();
		outerface = dict[json.outerface];
		nodes.forEach(function(n){
			n.updateReferences(dict);
		});
		edges.forEach(function(e){
			e.updateReferences(dict);
		});
		faces.forEach(function(f){
			f.updateReferences(dict);
		});		
		return this;
	}
	return planarmap;
};
