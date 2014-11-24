function Vec2(x_,y_)
{
	this.x = x_;
	this.y = y_;
	this.addVec = function(vec_){ this.x += vec_.x; this.y += vec_.y; return this; };
	this.subVec = function(vec_){ this.x -= vec_.x; this.y -= vec_.y; return this; };
	this.mult = function(r) { this.x *= r; this.y *= r; return this; };
	this.divide = function(r) { return this.mult(1/r); };
	this.dot = function(vec_) { return (this.x*vec_.x+this.y*vec_.y); };
	this.cross = function(vec_) { return (this.x*vec_.y-this.y*vec_.x); };
	this.angle = function(vec_) {
		// Returns the angle (between -PI and PI) this has to be rotated in
		// counterclockwise direction to align it with vec_. 
		var scale = this.norm()*vec_.norm();
		if( scale <= 0 )
			return NaN;
		return Math.atan2(this.cross(vec_)/scale,this.dot(vec_)/scale);
	};
	this.rotate = function(angle) { 
		var cosine = Math.cos(angle);
		var sine = Math.sin(angle);
		var tmpx = cosine * this.x - sine * this.y;
		this.y = sine * this.x + cosine * this.y;
		this.x = tmpx;
		return this;	
	};
	this.norm = function() { return Math.sqrt(this.dot(this)); };
	this.normSq = function() { return this.dot(this); };
	this.normalize = function() { var n = this.norm(); return this.divide(n); };
	this.zero = function() { this.x=0;this.y=0; return this; };
	this.copy = function() { return new Vec2(this.x,this.y); };
}


var CMap = CMap || {};

CMap.segmentsIntersect = function( e1, e2, links ){
	if( links[e1.link.id][0] == links[e2.link.id][0] || links[e1.link.id][0] == links[e2.link.id][1]
		|| links[e1.link.id][1] == links[e2.link.id][0] || links[e1.link.id][1] == links[e2.link.id][1] )
	{
		return false;
	}
	
	var v1 = e1.p2.copy().subVec(e1.p);
	var v2 = e2.p2.copy().subVec(e2.p);
	var cross = v1.cross(v2);
	if( cross == 0 )
		return false;
	
	var param = e2.p.copy().subVec(e1.p).cross(v2) / cross;
	if( param <= 0 || param >= 1 )
		return false;
	param = e2.p.copy().subVec(e1.p).cross(v1) / cross;
	if( param <= 0 || param >= 1 )
		return false;
	return true;	 
};

CMap.faceAngleSum = function(face,links,nodes){
	var totAngle = 0.0;

	var lastLink = face.links[face.links.length-1];
	var lastVec = nodes[links[lastLink.id][1]].pos.copy()
		.subVec(nodes[links[lastLink.id][0]].pos);
	if( !lastLink.ccw )
	{
		lastVec.mult(-1);
	}
	face.links.forEach(function(l){
		var curVec = nodes[links[l.id][1]].pos.copy().subVec(nodes[links[l.id][0]].pos);
		if( l.id == lastLink.id )
		{
			totAngle += 2*Math.PI;
		}else
		{
			if( !l.ccw )
			{
				curVec.mult(-1);
			}
			totAngle += Math.PI - lastVec.angle(curVec);		
		}
		lastVec = curVec;
		lastLink = l;
	});
	return totAngle;
};

CMap.faceIsNonSimple = function(face,links,nodes){

	var angle = CMap.faceAngleSum(face,links,nodes);
	//console.log(angle,(face.links.length-2));
	if( face.outer )
	{
		if( Math.abs(angle-(face.links.length+2)*Math.PI) > 0.1 )
			return true;
	}else
	{
		if( Math.abs(angle-(face.links.length-2)*Math.PI) > 0.1 )
			return true;
	}
	if( face.links.length == 3 )
	{
		return false;
	}
	
	var eventQueue = [];
	face.links.forEach(function(l){
		eventQueue.push({p: nodes[links[l.id][0]].pos, p2: nodes[links[l.id][1]].pos, link: l, 
			left: nodes[links[l.id][0]].pos.x <= nodes[links[l.id][1]].pos.x});
		eventQueue.push({p: nodes[links[l.id][1]].pos, p2: nodes[links[l.id][0]].pos, link: l,
			left: !(nodes[links[l.id][0]].pos.x <= nodes[links[l.id][1]].pos.x)});
	});
	eventQueue.sort(function(a,b){ return (a.p.x==b.p.x? a.p.y-b.p.y : a.p.x-b.p.x); });
	
	var sweepLine = [];
	return eventQueue.some(function(e){
		if( e.left )
		{
			var position = 0;
			if( sweepLine.some(function(s,i){ position=i; return s.p.y >= e.p.y; }) ) {
				sweepLine.splice(position,0,e);
			} else
			{
				sweepLine.push(e);
				position = sweepLine.length-1;
			}
			if( position > 0 && CMap.segmentsIntersect(e,sweepLine[position-1],links) )
				return true;
			if( position < sweepLine.length-1 && CMap.segmentsIntersect(e,sweepLine[position+1],links) )
				return true;
		} else
		{
			var position = 0;
			sweepLine.some(function(s,i){ position=i; return s.link == e.link; });
			sweepLine.splice(position,1);
			if( position > 0 && position < sweepLine.length &&
				CMap.segmentsIntersect( sweepLine[position], sweepLine[position-1], links ) )
				return true;
		}
	});
};

CMap.isNonSimple = function(faces,links,nodes){
	return faces.some(function(f){ return CMap.faceIsNonSimple(f,links,nodes);});
}

CMap.force = function (){
	var force = {};
	var event = d3.dispatch("start","tick","end");
	//var drag;
	var nodes = [];
	var faces = [];
	var links = [];
	var alpha = 0;
	var repulsionPower = 1.0;
	var springLength = 1.0;
	var springCoupling = 2.0;
	var controlParam = 0.4;
	var dragforce = {drag: false, coupling: 60};
	var fromScreenCoor;
	var clip = {use: false};
	var running = false;
	var centerPull = {pull: false, center: new Vec2(0,0), coupling: 3};
	
	force.nodes = function(x) {
		if (!arguments.length) return nodes;
		nodes = x;
		return force;
	};
	force.links = function(x) {
		if (!arguments.length) return links;
		links = x;
		return force;
	};
	force.faces = function(x) {
		if (!arguments.length) return faces;
		faces = x;
		return force;
	};
	force.repulsionPower = function(x) {
		if (!arguments.length) return repulsionPower;
		repulsionPower = x;
		return force;
	}; 	
	force.springLength = function(x) {
		if (!arguments.length) return springLength;
		springLength = x;
		return force;
	}; 	
	force.springCoupling = function(x) {
		if (!arguments.length) return springCoupling;
		springCoupling = x;
		return force;
	};
	force.fromScreenCoor = function(x) {
		if (!arguments.length) return fromScreenCoor;
		fromScreenCoor = x;
		return force;	
	};
	force.dragforce = function(x) {
		if (!arguments.length) return dragforce;
		dragforce = x;
		return force;	
	}; 	
	force.clip = function(x) {
		if (!arguments.length) return clip;
		clip = x;
		return force;	
	};
	force.centerPull = function(x) {
		if (!arguments.length) return centerPull;
		centerPull = x;
		return force;	
	};
	force.energy = function() {
	
		var energy = 0;
		faces.forEach(function(face){
    		face.links.forEach(function(l){
    			var nodeId = links[ l.id ][ l.ccw?0:1 ];
    			face.links.forEach(function(link){
    				if( links[ link.id ][0] != nodeId && links[ link.id ][1] != nodeId )
    				{
    					// (nodeId, link) is non-adjacent vertex-edge pair
    					var p = nodes[nodeId].pos, 
    						q1 = nodes[ links[link.id][0] ].pos, 
    						q2 = nodes[ links[link.id][1] ].pos;
    					energy += Math.pow( p.copy().subVec(q1).norm() 
    								+ p.copy().subVec(q2).norm()
    								- q1.copy().subVec(q2).norm(), -repulsionPower);
    				}
    			});
    		});   	
    	});
     	links.forEach(function(l){
    		var len = nodes[l[0]].pos.copy().subVec(nodes[l[1]].pos).norm();
    		energy += 0.5*springCoupling*(len - springLength)*(len - springLength);
    	});
    	
    	if( dragforce.drag )
    	{
      		energy += 0.5*dragforce.coupling * dragforce.cursor.copy().subVec(dragforce.node.pos).normSq();
    	}
    	if( centerPull.pull )
    	{
    		nodes.forEach(function(n){
    			energy += 0.5*centerPull.coupling * n.pos.copy().subVec(centerPull.center).normSq();
    		});
    	}
    	return energy;
	};
	 	
	force.tick = function() {
		if( !running )
		{
			return;
		}
    	nodes.forEach(function(n){ 
    		if( n.force ) { 
    			n.force.zero(); 
    		} else { 
    			n.force = new Vec2(0,0); 
    		}
   			n.oldpos = n.pos.copy();
    	});
    	
    	faces.forEach(function(face){
    		face.links.forEach(function(l){
    			var nodeId = links[ l.id ][ l.ccw?0:1 ];
    			face.links.forEach(function(link){
    				if( links[ link.id ][0] != nodeId && links[ link.id ][1] != nodeId )
    				{
    					// (nodeId, link) is non-adjacent vertex-edge pair
    					var p = nodes[nodeId].pos, 
    						q1 = nodes[ links[link.id][0] ].pos, 
    						q2 = nodes[ links[link.id][1] ].pos;
    					var scale = repulsionPower * 
    						Math.pow( p.copy().subVec(q1).norm() 
    								+ p.copy().subVec(q2).norm()
    								- q1.copy().subVec(q2).norm(), -repulsionPower-1);
    					var q1top = p.copy().subVec(q1).normalize();
    					var q2top = p.copy().subVec(q2).normalize();
    					var q1toq2 = q2.copy().subVec(q1).normalize();
    					nodes[nodeId].force.addVec( q1top.copy()
    						.addVec( q2top )
    						.mult(scale) );
    					nodes[links[link.id][0]].force.subVec( q1top
    						.subVec( q1toq2 )
    						.mult(scale) );
    					nodes[links[link.id][1]].force.subVec( q2top
    						.addVec( q1toq2 )
    						.mult(scale) );	
    				}
    			});
    		});   	
    	});
    	
    	links.forEach(function(l){
    		var diff = nodes[l[0]].pos.copy().subVec(nodes[l[1]].pos);
    		var len = diff.norm();
    		var f = diff.mult(springCoupling*(len - springLength)/len);
    		nodes[l[0]].force.subVec(f);
    		nodes[l[1]].force.addVec(f);
    	});
    	
    	if( dragforce.drag )
    	{
    		//console.log(dragforce);
    		dragforce.node.force.addVec( dragforce.cursor.copy().subVec(dragforce.node.pos).mult(dragforce.coupling));
    	}
    	if( centerPull.pull )
    	{
    		nodes.forEach(function(n){
    			n.force.subVec(n.pos.copy().subVec(centerPull.center).mult(centerPull.coupling));
    		});
    	}
    	
    	var stepsize = 0.004;
    	
    	var energy = force.energy();
    	//console.log(energy);
    	var gradSq = 0;
		nodes.forEach(function(n){gradSq += n.force.normSq();});
		if( gradSq / nodes.length < 0.002 )
		{
			console.log("stop");
			force.stop();
		} else
		{
		
			var done = false;
			var maxsteps = 50;
			while( maxsteps > 0 && !done ) {
				nodes.forEach(function(n){
					n.pos = n.oldpos.copy().addVec(n.force.copy().mult(stepsize));
					if( clip.use )
					{
						if( n.pos.x < clip.minX )
						{
							n.pos.x = clip.minX;
						} else if( n.pos.x > clip.maxX )
						{
							n.pos.x = clip.maxX;
						}
			 			if( n.pos.y < clip.minY )
						{
							n.pos.y = clip.minY;
						} else if( n.pos.y > clip.maxY )
						{
							n.pos.y = clip.maxY;
						}   			
					}
				});
				if( CMap.isNonSimple(faces,links,nodes) )
				{
					stepsize *= 0.5;
					console.log("nonsimple");
				} else
				{
					var newenergy = force.energy();
					//console.log(energy - newenergy, stepsize * gradSq);
					if( energy - newenergy > controlParam * stepsize * gradSq )
					{
						done = true;
					} else
					{	
						stepsize *= 0.5;
						maxsteps--;
					}
				}
			}
			//console.log(50-maxsteps,gradSq);
		}
    	event.tick({type: "tick", alpha: alpha});
  	};
  	
    force.start = function() {
     	return force.resume();
  	};

  	force.resume = function() {
   		if( !running )
  		{

	  	    event.start({type: "start"});
	  	    d3.timer(force.tick);
	  	}
	  	running = true;
    	return force;
  	};

  	force.stop = function() {
  		running = false;
    	return force;
  	};
  	
  	/*force.drag = function() {
  		console.log(arguments);
		if (!drag) drag = d3.behavior.drag()
		    .origin(function(x){return x;})
		    .on("dragstart", dragstart)
		    .on("drag", dragmove)
		    .on("dragend", dragend);

		if (!arguments.length) return drag;

    //this.on("mouseover.force", d3_layout_forceMouseover)
    //    .on("mouseout.force", d3_layout_forceMouseout)
    //    .call(drag);
  	};

	function dragstart(d) {
		console.log("start",d);
		dragforce.drag = true;
		dragforce.cursor = fromScreenCoor(d3.event);
		dragforce.node = d;
		force.resume(); // restart annealing
	}
	function dragmove(d) {
		console.log("dragmove",d);
		dragforce.drag = true;
		dragforce.cursor = fromScreenCoor(d3.event);
		dragforce.node = d;
		force.resume(); // restart annealing
	}
	function dragend(d) {
		dragforce.drag = false;
	}
	*/
	return d3.rebind(force,event,"on");
};


