var Vec2 = function (x_,y_)
{
	this.x = x_;
	this.y = y_;
};

Vec2.prototype.addVec = function(vec_){ this.x += vec_.x; this.y += vec_.y; return this; };
Vec2.prototype.subVec = function(vec_){ this.x -= vec_.x; this.y -= vec_.y; return this; };
Vec2.prototype.mult = function(r) { this.x *= r; this.y *= r; return this; };
Vec2.prototype.divide = function(r) { return this.mult(1/r); };
Vec2.prototype.dot = function(vec_) { return (this.x*vec_.x+this.y*vec_.y); };
Vec2.prototype.cross = function(vec_) { return (this.x*vec_.y-this.y*vec_.x); };
Vec2.prototype.angle = function(vec_) {
	// Returns the angle (between -PI and PI) this has to be rotated in
	// counterclockwise direction to align it with vec_. 
	return Math.atan2(this.cross(vec_),this.dot(vec_));
};
Vec2.prototype.anglePos = function(vec_) {
	// Returns the angle (between 0 and 2 PI) this has to be rotated in
	// counterclockwise direction to align it with vec_. 
	var angle = this.angle(vec_);
	return (angle < 0 ? angle + 2*Math.PI : angle);
};
Vec2.prototype.rotate = function(angle) { 
	var cosine = Math.cos(angle);
	var sine = Math.sin(angle);
	var tmpx = cosine * this.x - sine * this.y;
	this.y = sine * this.x + cosine * this.y;
	this.x = tmpx;
	return this;	
};
Vec2.prototype.norm = function() { return Math.sqrt(this.dot(this)); };
Vec2.prototype.normSq = function() { return this.dot(this); };
Vec2.prototype.normalize = function() { var n = this.norm(); return this.divide(n); };
Vec2.prototype.zero = function() { this.x=0;this.y=0; return this; };
Vec2.prototype.copy = function() { return new Vec2(this.x,this.y); };
/* Returns true if the angular direction of this is in the counterclockwise order between v1 and v2 */
Vec2.prototype.isInBetween = function(v1,v2) {
	var angle1 = v1.anglePos(this);
	var angle2 = v1.anglePos(v2);
	return angle1 > 0 && angle1 < angle2;
}

var CMap = CMap || {};

/*
	Input:
		line1, line2 - Arrays of two Vec2's 
		ignoreEndPoints - if true line1 and line2 may share an end point
	Output:
		returns true when they intersect (in their interior)
*/
CMap.segmentsIntersect = function( line1, line2, ignoreEndPoints ){
	if( arguments.length < 3 ) ignoreEndPoints = true;
	if( !ignoreEndPoints && 
		(line1[0] == line2[0] || line1[0] == line2[1]
		|| line1[1] == line2[0] || line1[1] == line2[1] ) )
	{
		return true;
	}

	var v1 = line1[1].copy().subVec(line1[0]);
	var v2 = line2[1].copy().subVec(line2[0]);
	var cross = v1.cross(v2);
	if( ignoreEndPoints && (line1[0] == line2[0] || line1[0] == line2[1]
		|| line1[1] == line2[0] || line1[1] == line2[1]) )
	{
		if( cross == 0 )
		{
			// check whether they do not overlap
			if( line1[0] == line2[0] || line1[1] == line2[1] )
			{
				return v1.dot(v2) >= 0;
			}
			if( line1[1] == line2[0] ||	line1[0] == line2[1] )
			{
				return v1.dot(v2) <= 0;
			}
		} else
		{
			return false;
		}	
	}
	var d0 = line2[0].copy().subVec(line1[0]);
	if( cross == 0 )
	{
		// check whether they do not overlap
		if( d0.cross(v1) == 0 )
		{
			var min0 = Math.min( 0, v1.dot(v1) ),
				max0 = Math.max( 0, v1.dot(v1) ),
				min1 = v1.dot(d0) + Math.min( 0, v1.dot(v2) ),
				max1 = v1.dot(d0) + Math.max( 0, v1.dot(v2) );
			return (max1 >= max0 && min1 <= max0) || (min1 <= min0 && max1 >= min0 );
		} else
		{
			return false;
		}
	}
	var between01 = function(x){return 0 <= x && x <= 1;}
	return between01(d0.cross(v2)/cross) && between01(d0.cross(v1)/cross); 
}

/*
	input:
		facecoor - an array of Vec2's representing the vertices
		diagIds - an array of two indices of facecoor representing the diagonal
	Note that equality of points is established by comparing objects,
	so make sure not to provide copies of the same Vec2's.
	
	output:
		Returns true when the diagonal divides the polygon into
		two simple polygons.
*/
CMap.isProperDiagonal = function(facecoor,diagIds){
	var next = function(i) { return (i+1)%facecoor.length; };
	var prev = function(i) { return (i+facecoor.length-1)%facecoor.length; };
	var line = [facecoor[diagIds[0]],facecoor[diagIds[1]]];

	// Check that the directions are inward
	if( !(facecoor[next(diagIds[0])]==facecoor[prev(diagIds[0])] || line[1].copy().subVec(line[0]).isInBetween(
			facecoor[next(diagIds[0])].copy().subVec(line[0]),
			facecoor[prev(diagIds[0])].copy().subVec(line[0]) ) ) || 
		!(facecoor[next(diagIds[1])]==facecoor[prev(diagIds[1])] || line[0].copy().subVec(line[1]).isInBetween(
			facecoor[next(diagIds[1])].copy().subVec(line[1]),
			facecoor[prev(diagIds[1])].copy().subVec(line[1]) ) ) )
	{
		return false;
	}
	
	for(var i=0;i<facecoor.length;i++)
	{
		if( CMap.segmentsIntersect( [facecoor[i],facecoor[next(i)]], line) )
			return false;
	}
	return true;
}

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
		if( !l.ccw )
		{
			curVec.mult(-1);
		}
		if( l.id == lastLink.id )
		{
			totAngle += 2*Math.PI;
		}else
		{
			totAngle += Math.PI - lastVec.angle(curVec);		
		}

		lastVec = curVec;
		lastLink = l;
	});
	return totAngle;
};

CMap.faceIsNonSimple = function(face,links,nodes){

	var angle = CMap.faceAngleSum(face,links,nodes);
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
	var uniquelinks = {};
	face.links.forEach(function(l){
		if( !uniquelinks[l.id] )
		{
			uniquelinks[l.id] = true;
			eventQueue.push({p: nodes[links[l.id][0]].pos, p2: nodes[links[l.id][1]].pos, link: l, 
				left: nodes[links[l.id][0]].pos.x <= nodes[links[l.id][1]].pos.x});
			eventQueue.push({p: nodes[links[l.id][1]].pos, p2: nodes[links[l.id][0]].pos, link: l,
				left: !(nodes[links[l.id][0]].pos.x <= nodes[links[l.id][1]].pos.x)});
		}
	});
	eventQueue.sort(function(a,b){ return (a.p==b.p? a.p2.x-b.p2.x : a.p.x-b.p.x); });
	
	var sweepLine = [];
	return eventQueue.some(function(e){
		if( e.left )
		{
			var position = 0;
			if( sweepLine.some(function(s,i){ position=i; return (s.p == e.p ? 
					(s.p2.y - s.p.y)*(e.p2.x-e.p.x) >= (e.p2.y - e.p.y)*(s.p2.x-s.p.x) : s.p.y >= e.p.y); }) ) {
				sweepLine.splice(position,0,e);
			} else
			{
				sweepLine.push(e);
				position = sweepLine.length-1;
			}
			if( position > 0 && CMap.segmentsIntersect([e.p,e.p2],[sweepLine[position-1].p,sweepLine[position-1].p2]) )
				return true;
			if( position < sweepLine.length-1 && CMap.segmentsIntersect([e.p,e.p2],
								[sweepLine[position+1].p,sweepLine[position+1].p2]) )
				return true;
		} else
		{
			var position = 0;
			sweepLine.some(function(s,i){ position=i; return s.link == e.link; });
			sweepLine.splice(position,1);
			if( position > 0 && position < sweepLine.length &&
				CMap.segmentsIntersect( [sweepLine[position].p,sweepLine[position].p2], 
										[sweepLine[position-1].p,sweepLine[position-1].p2] ) )
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
    					energy += Math.pow( (p.copy().subVec(q1).norm() 
    								+ p.copy().subVec(q2).norm()
    								- q1.copy().subVec(q2).norm())/springLength, -repulsionPower);
    				}
    			});
    		});   	
    	});
     	links.forEach(function(l){
    		var len = nodes[l[0]].pos.copy().subVec(nodes[l[1]].pos).norm();
    		energy += 0.5*springCoupling*(len - springLength)*(len - springLength)/springLength;
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
			return true;
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
    						Math.pow( (p.copy().subVec(q1).norm() 
    								+ p.copy().subVec(q2).norm()
    								- q1.copy().subVec(q2).norm())/springLength, -repulsionPower-1)/springLength;
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
    		var f = diff.mult(springCoupling*(len - springLength)/len/springLength);
    		nodes[l[0]].force.subVec(f);
    		nodes[l[1]].force.addVec(f);
    	});
    	
    	if( dragforce.drag )
    	{
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
    	var gradSq = 0;
    	var maxForce = 0;
		nodes.forEach(function(n){gradSq += n.force.normSq();maxForce=Math.max(maxForce,n.force.normSq());});
		maxForce = Math.sqrt(maxForce);
		if( maxForce > 0 )
		{
			stepsize = Math.min(stepsize,0.1/maxForce);
		}
		if( gradSq / nodes.length < 0.002 )
		{
			force.stop();
			return true;
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
		}
    	event.tick({type: "tick"});
    	
    	return false;
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
  		if( running )
  		{
  			event.end({type: "end"});
  		}
  		running = false;
    	return force;
  	};
  	
	return d3.rebind(force,event,"on");
};


