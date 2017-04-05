// *******************************************************
// CS 174a Graphics Example Code
// animation.js - The main file and program start point.  The class definition here describes how to display an Animation and how it will react to key and mouse input.  Right now it has 
// no meaningful scenes to draw - you will fill it in (at the bottom of the file) with all your shape drawing calls and any extra key / mouse controls.  

// Now go down to display() to see where the sample shapes you see drawn are coded, and where to fill in your own code.

"use strict"      // Selects strict javascript
var canvas, canvas_size, shaders, gl = null, g_addrs,          // Global variables
	thrust = vec3(), 	origin = vec3( 0, 10, -15 ), looking = false, prev_time = 0, animate = false, animation_time = 0, gouraud = false, color_normals = false;

// *******************************************************
// IMPORTANT -- Any new variables you define in the shader programs need to be in the list below, so their GPU addresses get retrieved.

var shader_variable_names = [ "camera_transform", "camera_model_transform", "projection_camera_model_transform", "camera_model_transform_normal",
                              "shapeColor", "lightColor", "lightPosition", "attenuation_factor", "ambient", "diffusivity", "shininess", "smoothness", 
                              "animation_time", "COLOR_NORMALS", "GOURAUD", "USE_TEXTURE" ];
   
function Color( r, g, b, a ) { return vec4( r, g, b, a ); }     // Colors are just special vec4s expressed as: ( red, green, blue, opacity )
function CURRENT_BASIS_IS_WORTH_SHOWING(self, model_transform) { self.m_axis.draw( self.basis_id++, self.graphicsState, model_transform, new Material( Color( .8,.3,.8,1 ), .1, 1, 1, 40, undefined ) ); }

// *******************************************************
// IMPORTANT -- In the line below, add the filenames of any new images you want to include for textures!

var texture_filenames_to_load = [ "stars.png", "text.png", "earth.gif", "fish.png", "bed.png", "ocean.png", "stone1.png", "stone2.png", "l_rock.png", 
									"red.png", "green.png", "leaf.png", "t_shell.png", "t_body.png", "clam.png" ];

window.onload = function init() {	var anim = new Animation();	}   // Our whole program's entry point

// *******************************************************	
// When the web page's window loads it creates an "Animation" object.  It registers itself as a displayable object to our other class "GL_Context" -- 
// which OpenGL is told to call upon every time a draw / keyboard / mouse event happens.
function Animation()    // A class.  An example of a displayable object that our class GL_Context can manage.
{
	( function init( self )
	{
		self.context = new GL_Context( "gl-canvas", Color( 0, 0, 0, 1 ) );    // Set your background color here
		self.context.register_display_object( self );
		
    shaders = { "Default":     new Shader( "vertex-shader-id", "fragment-shader-id" ), 
                "Demo_Shader": new Shader( "vertex-shader-id", "demo-shader-id"     )  };
    
		for( var i = 0; i < texture_filenames_to_load.length; i++ )
			initTexture( texture_filenames_to_load[i], true );
    self.mouse = { "from_center": vec2() };
		            
    self.m_strip       = new Old_Square();                // At the beginning of our program, instantiate all shapes we plan to use, 
		self.m_tip         = new Tip( 3, 10 );                // each with only one instance in the graphics card's memory.
    self.m_cylinder    = new Cylindrical_Tube( 10, 10 );  // For example we'll only create one "cube" blueprint in the GPU, but we'll re-use 
    self.m_torus       = new Torus( 25, 25 );             // it many times per call to display to get multiple cubes in the scene.
    self.m_sphere      = new Sphere( 10, 10 );
    self.poly          = new N_Polygon( 7 );
    self.m_cone        = new Cone( 10, 10 );
    self.m_capped      = new Capped_Cylinder( 4, 12 );
    self.m_prism       = new Prism( 8, 8 );
    self.m_cube        = new Cube();
    self.m_sub         = new Subdivision_Sphere( 4, true );
    self.m_axis        = new Axis();
 
    // created
    self.m_fish        = new Fish();
    self.m_shell       = new Shell();
    self.m_clam		   = new Clam();	
    self.m_rock        = new Rock(10);
    self.m_leaf		   = new Leaf();
    self.m_body		   = new T_body();
    self.m_hand		   = new T_hand();
    self.m_leg		   = new T_leg();
    self.m_head		   = new T_head();

    // imported
    self.m_stone1      = new Shape_From_File( "stone1.obj", scale( .1, .1, .1 ) );
    self.m_stone2      = new Shape_From_File( "stone2.obj", scale( .1, .1, .1 ) );

// 1st parameter is our starting camera matrix.  2nd parameter is the projection:  The matrix that determines how depth is treated.  It projects 3D points onto a plane.
		self.graphicsState = new GraphicsState( translation(0, 0,-25), perspective(45, canvas.width/canvas.height, .1, 1000), 0 );
		
		self.context.render();	
	} ) ( this );
	
// *** Mouse controls: ***
  var mouse_position = function( e ) { return vec2( e.clientX - canvas.width/2, e.clientY - canvas.height/2 ); };   // Measure mouse steering, for rotating the flyaround camera.     
  canvas.addEventListener("mouseup",   ( function(self) { return function(e)	{ e = e || window.event;		self.mouse.anchor = undefined;              } } ) (this), false );
	canvas.addEventListener("mousedown", ( function(self) { return function(e)	{	e = e || window.event;    self.mouse.anchor = mouse_position(e);      } } ) (this), false );
  canvas.addEventListener("mousemove", ( function(self) { return function(e)	{ e = e || window.event;    self.mouse.from_center = mouse_position(e); } } ) (this), false );                                         
  canvas.addEventListener("mouseout", ( function(self) { return function(e)	{ self.mouse.from_center = vec2(); }; } ) (this), false );        // Stop steering if the mouse leaves the canvas. 
}
  
// *******************************************************	
// init_keys():  Define any extra keyboard shortcuts here
Animation.prototype.init_keys = function()
{
	shortcut.add( "Space", function() { thrust[1] = -1; } );			shortcut.add( "Space", function() { thrust[1] =  0; }, {'type':'keyup'} );
	shortcut.add( "z",     function() { thrust[1] =  1; } );			shortcut.add( "z",     function() { thrust[1] =  0; }, {'type':'keyup'} );
	shortcut.add( "w",     function() { thrust[2] =  1; } );			shortcut.add( "w",     function() { thrust[2] =  0; }, {'type':'keyup'} );
	shortcut.add( "a",     function() { thrust[0] =  1; } );			shortcut.add( "a",     function() { thrust[0] =  0; }, {'type':'keyup'} );
	shortcut.add( "s",     function() { thrust[2] = -1; } );			shortcut.add( "s",     function() { thrust[2] =  0; }, {'type':'keyup'} );
	shortcut.add( "d",     function() { thrust[0] = -1; } );			shortcut.add( "d",     function() { thrust[0] =  0; }, {'type':'keyup'} );
	shortcut.add( "f",     function() { looking = !looking; } );
	shortcut.add( ",",   ( function(self) { return function() { self.graphicsState.camera_transform = mult( rotation( 3, 0, 0,  1 ), self.graphicsState.camera_transform       ); } } ) (this) ) ;
	shortcut.add( ".",   ( function(self) { return function() { self.graphicsState.camera_transform = mult( rotation( 3, 0, 0, -1 ), self.graphicsState.camera_transform       ); } } ) (this) ) ;
  	shortcut.add( "o",   ( function(self) { return function() { origin = vec3( mult_vec( inverse( self.graphicsState.camera_transform ), vec4(0,0,0,1) )                       ); } } ) (this) ) ;
	shortcut.add( "r",   ( function(self) { return function() { self.graphicsState.camera_transform = mat4(); }; } ) (this) );
	shortcut.add( "ALT+g", function() { gouraud = !gouraud; } );
	shortcut.add( "ALT+n", function() { color_normals = !color_normals;	} );
	shortcut.add( "ALT+a", function() { animate = !animate; } );
	shortcut.add( "p",     ( function(self) { return function() { self.m_axis.basis_selection++; }; } ) (this) );
	shortcut.add( "m",     ( function(self) { return function() { self.m_axis.basis_selection--; }; } ) (this) );	
}

Animation.prototype.update_strings = function( debug_screen_strings )	      // Strings that this displayable object (Animation) contributes to the UI:	
{
	debug_screen_strings.string_map["fps"]    = "Fps: " + 1000/this.animation_delta_time
	debug_screen_strings.string_map["time"]    = "Animation Time: " + this.graphicsState.animation_time/1000 + "s";
	//debug_screen_strings.string_map["basis"]   = "Showing basis: " + this.m_axis.basis_selection;
	debug_screen_strings.string_map["animate"] = "Animation " + (animate ? "on" : "off") ;
	//debug_screen_strings.string_map["thrust"]  = "Thrust: " + thrust;
}

function update_camera( self, animation_delta_time )
	{
		var leeway = 70,  degrees_per_frame = .0004 * animation_delta_time,
                      	meters_per_frame  =   .01 * animation_delta_time;
										
    if( self.mouse.anchor ) // Dragging mode: Is a mouse drag occurring?
    {
      var dragging_vector = subtract( self.mouse.from_center, self.mouse.anchor);           // Arcball camera: Spin the scene around the world origin on a user-determined axis.
      if( length( dragging_vector ) > 0 )
        self.graphicsState.camera_transform = mult( self.graphicsState.camera_transform,    // Post-multiply so we rotate the scene instead of the camera.
            mult( translation(origin),                                                      
            mult( rotation( .05 * length( dragging_vector ), dragging_vector[1], dragging_vector[0], 0 ), 
            translation(scale_vec( -1,origin ) ) ) ) );
    }    
          // Flyaround mode:  Determine camera rotation movement first
		var movement_plus  = [ self.mouse.from_center[0] + leeway, self.mouse.from_center[1] + leeway ];  // mouse_from_center[] is mouse position relative to canvas center;
		var movement_minus = [ self.mouse.from_center[0] - leeway, self.mouse.from_center[1] - leeway ];  // leeway is a tolerance from the center before it starts moving.
		
		for( var i = 0; looking && i < 2; i++ )			// Steer according to "mouse_from_center" vector, but don't start increasing until outside a leeway window from the center.
		{
			var velocity = ( ( movement_minus[i] > 0 && movement_minus[i] ) || ( movement_plus[i] < 0 && movement_plus[i] ) ) * degrees_per_frame;	// Use movement's quantity unless the &&'s zero it out
			self.graphicsState.camera_transform = mult( rotation( velocity, i, 1-i, 0 ), self.graphicsState.camera_transform );			// On X step, rotate around Y axis, and vice versa.
		}
		self.graphicsState.camera_transform = mult( translation( scale_vec( meters_per_frame, thrust ) ), self.graphicsState.camera_transform );		// Now translation movement of camera, applied in local camera coordinate frame
	}

// A short function for testing.  It draws a lot of things at once.  See display() for a more basic look at how to draw one thing at a time.
Animation.prototype.test_lots_of_shapes = function( model_transform )
  {
    var shapes = [ this.m_prism, this.m_capped, this.m_cone, this.m_sub, this.m_sphere, this.m_obj, this.m_torus ];   // Randomly include some shapes in a list
    var tex_names = [ undefined, "stars.png", "earth.gif" ]
    
    for( var i = 3; i < shapes.length + 3; i++ )      // Iterate through that list
    {
      var spiral_transform = model_transform, funny_number = this.graphicsState.animation_time/20 + (i*i)*Math.cos( this.graphicsState.animation_time/2000 );
      spiral_transform = mult( spiral_transform, rotation( funny_number, i%3 == 0, i%3 == 1, i%3 == 2 ) );    
      for( var j = 1; j < 4; j++ )                                                                                  // Draw each shape 4 times, in different places
      {
        var mat = new Material( Color( i % j / 5, j % i / 5, i*j/25, 1 ), .3,  1,  1, 40, tex_names[ (i*j) % tex_names.length ] )       // Use a random material
        // The draw call:
        shapes[i-3].draw( this.graphicsState, spiral_transform, mat );			                        //  Draw the current shape in the list, passing in the current matrices		
        spiral_transform = mult( spiral_transform, rotation( 63, 3, 5, 7 ) );                       //  Move a little bit before drawing the next one
        spiral_transform = mult( spiral_transform, translation( 0, 5, 0) );
      } 
      model_transform = mult( model_transform, translation( 0, -3, 0 ) );
    }
    return model_transform;     
  }
    
// *******************************************************	
// display(): Called once per frame, whenever OpenGL decides it's time to redraw.

Animation.prototype.display = function(time)
	{  
		if(!time) time = 0;                                                               // Animate shapes based upon how much measured real time has transpired
		this.animation_delta_time = time - prev_time;                                     // by using animation_time
		if( animate ) this.graphicsState.animation_time += this.animation_delta_time;
		prev_time = time;
		
		update_camera( this, this.animation_delta_time );
			
		var model_transform = mat4();	            // Reset this every frame.
		this.basis_id = 0;	                      // For the "axis" shape.  This variable uniquely marks each axis we draw in display() as it counts them up.
    
    shaders[ "Default" ].activate();                         // Keep the flags seen by the default shader program up-to-date
		gl.uniform1i( g_addrs.GOURAUD_loc, gouraud );		gl.uniform1i( g_addrs.COLOR_NORMALS_loc, color_normals);    
		
    
		// *** Lights: *** Values of vector or point lights over time.  Arguments to construct a Light(): position or vector (homogeneous coordinates), color, size
    // If you want more than two lights, you're going to need to increase a number in the vertex shader file (index.html).  For some reason this won't work in Firefox.
    this.graphicsState.lights = [];                    // First clear the light list each frame so we can replace & update lights.
    
    //var light_orbit = [ Math.cos(this.graphicsState.animation_time/1000), Math.sin(this.graphicsState.animation_time/1000) ];
    var light_orbit = [0, 0];
    this.graphicsState.lights.push( new Light( vec4(  30 * light_orbit[0],  30*light_orbit[1],  34 * light_orbit[0], 1 ), Color( 0, .4, 0, 1 ), 100000 ) );
    this.graphicsState.lights.push( new Light( vec4( -10 * light_orbit[0], -20*light_orbit[1], -14 * light_orbit[0], 0 ), Color( 1, 1, .3, 1 ), 100 * Math.cos(this.graphicsState.animation_time/10000 ) ) );
    
		// *** Materials: *** Declare new ones as temps when needed; they're just cheap wrappers for some numbers.
		// 1st parameter:  Color (4 floats in RGBA format), 2nd: Ambient light, 3rd: Diffuse reflectivity, 4th: Specular reflectivity, 5th: Smoothness exponent, 6th: Texture image.
		var purplePlastic = new Material( Color( .9,.5,.9,1 ), .01, .2, .4, 40 ), // Omit the final (string) parameter if you want no texture
          greyPlastic = new Material( Color( .5,.5,.5, 1 ), .01, .4, .2, 20 ),
                earth = new Material( Color( .5,.5,.5, 1 ), .1,  1, .5, 40, "earth.gif" ),
                stars = new Material( Color( .5,.5,.5, 1 ), .1,  1,  1, 40, "stars.png" );
			
		/**********************************
		Start coding down here!!!!
		**********************************/		// From this point on down it's just some examples for you -- feel free to comment it all out.
		var elapsed_time = this.graphicsState.animation_time/1000;
		this.turtle = {};
		this.turtle.location = mat4();
		this.turtle.location = mult( this.turtle.location, translation(tur_x, tur_y, tur_z) );
		this.turtle.location = mult( this.turtle.location, rotation(-70, 1, 0, 0) );
		this.turtle.location = mult( this.turtle.location, rotation(20, 0, 1, 0) );
		this.turtle.location = mult( this.turtle.location, rotation(-40, 0, 0, 1) );


		this.drawScene(model_transform);
		this.drawAnimal(model_transform, this.turtle.location, elapsed_time);


	}

var bed_l = 500, bed_h = 20, bed_w = 500,
	rock_x = -bed_l/4, rock_y = 70, rock_z = -bed_w/4,
	tur_x = -150, tur_y = 40, tur_z = 30,
	fish_fr_rock = 50,
	fish_max_height = 10,
	hand_angle_max = 20,
	leg_angle_max = 10;
var turtle_l_velocity = vec3();
var randomForBed1 = randomBetween( 20, -240, 240 );
var randomForBed2 = randomBetween( 19, 1, 9 );
var randomForFish1 = randomBetween( 20, -240, 240 );
var randomForFish2 = randomBetween( 19, 40, 90 );

var bed    = new Material( Color( .2,.3,.5, 1 ), .5, .2, .4, 40, "bed.png"),
	stone1 = new Material( Color( .3,.3,.1, 1 ), .5, .2, .4, 40, "stone1.png"),
	stone2 = new Material( Color( .2,.2,.2, 1 ), .5, .2, .4, 40, "stone2.png"),
	stone3 = new Material( Color( .2,.2,.2, 1 ), .5, .2, .4, 40, "stone2.png"),
	stone4 = new Material( Color( .8,.4,.2, 1 ), .5, .2, .4, 40, "stone2.png"),
	l_rock = new Material( Color( .5,.3,.1, 1 ), .5, .2, .4, 40, "l_rock.png"),
	ocean  = new Material( Color(  0, 0,.8, 1 ), .5, .2, .4, 40, "ocean.png"),
 	fish   = new Material( Color( .4,.6,.9, 1 ), .1, .2, .4, 40, "fish.png" ),
 	green  = new Material( Color(  0,.3, 0, 1 ), .1, .2, .4, 40, "green.png" ),
 	leaf   = new Material( Color( .4,.8,.2, 1 ), .1, .2, .4, 40, "leaf.png" ),
 	red    = new Material( Color( .7,.2,.2, 1 ), .1, .2, .4, 40, "red.png" ),
 	yellow = new Material( Color(  1,.8, 0, 1 ), .1, .2, .4, 40, "red.png" ),
 	t_shell= new Material( Color( .3,.1,.1, 1 ), .1, .2, .4, 40, "t_shell.png" ),
 	clam   = new Material( Color( .9,.4,.7, 1 ), .1, .2, .4, 40, "clam.png" ),
 	t_body = new Material( Color( .9,.9,.5, 1 ), .1, .2, .4, 40, "t_body.png" );

function randomBetween(num, start, end){
	var stack = [];
	for( var i = 0; i < num; i++ ){
		stack.push( Math.random() * (end-start) + start );
	}
	return stack;
}

Animation.prototype.drawBed = function(model_transform){
	var stack = [];
	stack.push(model_transform);
	model_transform = mult( model_transform, scale(bed_l, bed_h, bed_w) );
	this.m_cube.draw( this.graphicsState, model_transform, bed );
	model_transform = stack.pop();

	for( var i = 0; i < 19; i++ ){
		stack.push(model_transform);
		model_transform = mult( model_transform, translation(randomForBed1[i], randomForBed2[i], randomForBed1[i+1]) );
		model_transform = mult( model_transform, scale(15, 15, 15) );
		model_transform = mult( model_transform, rotation(45, 0, 0, 1) );
		
		this.m_cube.draw( this.graphicsState, model_transform, bed );
		model_transform = stack.pop();
	}
	return model_transform;		
}

Animation.prototype.drawScene = function(model_transform){
	var def_tranform = model_transform;
	// background
	model_transform = mult( model_transform, scale(1000, 1000, 1000) );
	this.m_cube.draw( this.graphicsState, model_transform, ocean );

	this.drawBed(def_tranform);
	this.drawRock(def_tranform);
	this.drawPlants(def_tranform);

	return def_tranform;
}

Animation.prototype.drawFishes = function(model_transform, elapsed_time){
	var stack = [];
	stack.push(model_transform);

	// moving around large rock
	model_transform = mult( model_transform, translation( rock_x+40, rock_y, rock_z ) );
	var translate_then_rotate = mult( translation( -fish_fr_rock, 0, 0 ), rotation( this.graphicsState.animation_time/100, 0, -1, 0 ) );
	var rotate_around_rock = mult( translate_then_rotate, translation( fish_fr_rock, 0, 0 ) );
	model_transform = mult( model_transform, rotate_around_rock );
	model_transform = mult( model_transform, translation( 0, fish_max_height * Math.sin(this.graphicsState.animation_time/1000), 0 ) );
	model_transform = mult( model_transform, rotation( 90, 0, 1, 0) );
	model_transform = mult( model_transform, scale(2, 2, 2) );

	// group of fishes
	var fishPosition = [ vec3(0,0,0), vec3(4,0,-1), vec3(4,2,1), vec3(4,-2,0),
						 vec3(8,0,-1), vec3(8,2,1), vec3(8,4,0), vec3(8,-2,-1),
						 vec3(8,-4,1), vec3(12,0,0) ];
	for( var i = 0; i < 10; i++ ){
		stack.push(model_transform);
		model_transform = mult( model_transform, translation( fishPosition[i][0], fishPosition[i][1], fishPosition[i][2] ) );
		this.m_fish.draw( this.graphicsState, model_transform, fish );
		model_transform = stack.pop();
	}
	model_transform = stack.pop();

	for( var i = 0; i < 19; i++ ){
		stack.push(model_transform);
		model_transform = mult( model_transform, translation(randomForFish1[i], randomForFish2[i], randomForFish1[i+1]) );
		var delta = translation( scale_vec( elapsed_time, vec3(-2, 0, 0) ) );
				model_transform = mult( model_transform, rotation( (10*i), 0, 1, 0 ) );
		model_transform = mult( model_transform, delta );
		model_transform = mult( model_transform, translation( 0, 2 * Math.sin(this.graphicsState.animation_time/1000), 0 ) );
		model_transform = mult( model_transform, scale(2, 2, 2) );

		
		this.m_fish.draw( this.graphicsState, model_transform, fish );
		model_transform = stack.pop();
	}

	return model_transform;
}

Animation.prototype.drawAnimal = function(model_transform, turtle_location, elapsed_time){
	this.drawFishes(model_transform, elapsed_time);

	turtle_l_velocity = vec3(0, 2, 1);
	var delta = translation( scale_vec( elapsed_time, turtle_l_velocity ) );
	turtle_location = mult( turtle_location, delta );
	turtle_location = mult( turtle_location, scale(2, 2, 2) );  	
	this.drawTurtle(turtle_location);
	if(elapsed_time > 80) this.graphicsState.camera_transform = lookAt( vec3(70, 80, -180), vec3(-50, 40, -50), vec3(0, 1, 0) );
	else this.graphicsState.camera_transform = lookAt( vec3(turtle_location[0][3]-35, turtle_location[1][3]+5, turtle_location[2][3]+40), vec3(turtle_location[0][3], turtle_location[1][3], turtle_location[2][3]), vec3(0, 1, 0) );
}

Animation.prototype.drawPlant1 = function(model_transform, rotation_dir, scale_y, texture){
	var stack = [];
	stack.push(model_transform);

	for( var i = 0; i < rotation_dir.length; i++ ){
		stack.push(model_transform);
		model_transform = mult( model_transform, rotation( rotation_dir[i][0], rotation_dir[i][1], rotation_dir[i][2], rotation_dir[i][3] ) );
		model_transform = mult( model_transform, scale(1, scale_y, 1) );
		this.m_cube.draw( this.graphicsState, model_transform, texture );
		model_transform = stack.pop();
	}
	model_transform = stack.pop();
	return model_transform;	
}

Animation.prototype.drawPlant2 = function(model_transform){
	var stack = [];
	stack.push(model_transform);

	for( var i = 1; i < 9; i++ ){
		model_transform = mult( model_transform, rotation( -10/i, 0, 0, 1) );
		stack.push(model_transform);
		model_transform = mult( model_transform, scale(.3,8,.3) );
		this.m_cube.draw( this.graphicsState, model_transform, red );
		model_transform = stack.pop();
		model_transform = mult( model_transform, translation(.4/i, 8, 0) );
		if( i===7 || i===8 ) continue;
		stack.push(model_transform);

		for( var j = 1; j < 6; j++ ){
			model_transform = mult( model_transform, rotation( 25/j, 0, 0, 1) );
			stack.push(model_transform);
			model_transform = mult( model_transform, translation(-2, -.5, 0) );
			model_transform = mult( model_transform, scale(.2,6,.2) );
			this.m_cube.draw( this.graphicsState, model_transform, red );
			model_transform = stack.pop();
			model_transform = mult( model_transform, translation(-.95/j, 6.2, 0) );
			if( j===5 ) continue;

			stack.push(model_transform);
			model_transform = mult( model_transform, rotation( -30, 0, 0, 1) );
			model_transform = mult( model_transform, translation(-1, 0, 0) );
			model_transform = mult( model_transform, scale(.2,4,.2) );
			this.m_cube.draw( this.graphicsState, model_transform, red );
			model_transform = stack.pop();
		}
		model_transform = stack.pop();
	}
	model_transform = stack.pop()
	return model_transform;
}

Animation.prototype.drawPlant3 = function(model_transform){
	var stack = [];
	stack.push(model_transform);
	var rotation_dir = [22, 53, 90, 35, 105, 165, 169, 203, 285, 333, 156, 242, 54, 96, 10, 180];

	for( var i = 1; i < 8; i++ ){
		//stack.push(model_transform);
		model_transform = mult( model_transform, rotation( 3 * Math.sin(this.graphicsState.animation_time/3000), 1, 0, 0 ) );
		//model_transform = mult( model_transform, rotation( -5/i, 0, 0, 1) );

		model_transform = mult( model_transform, translation(0, 4, 0) );
		stack.push(model_transform);
		model_transform = mult( model_transform, scale(.3,8,.3) );
		this.m_cube.draw( this.graphicsState, model_transform, green );
		model_transform = stack.pop();
		model_transform = mult( model_transform, translation(0, 4, 0) );
		if( i===7 ) continue;
		stack.push(model_transform);		

		model_transform = mult( model_transform, rotation( rotation_dir[i-1], 0, 1, 0) );
		this.m_leaf.draw(this.graphicsState, model_transform, leaf);
		model_transform = mult( model_transform, rotation( rotation_dir[i], 0, 1, 0) );
		this.m_leaf.draw(this.graphicsState, model_transform, leaf);		
		model_transform = stack.pop();
	}
	model_transform = stack.pop()
	return model_transform;	
}

Animation.prototype.drawPlant4 = function(model_transform){
	var stack = [];
	stack.push(model_transform);
	var rotation_dir = [122, 53, 9, 45, 15, 265, 199, 278];

	for( var i = 1; i < 8; i++ ){
		model_transform = mult( model_transform, rotation( -5/i, 0, 0, 1) );
		stack.push(model_transform);
		model_transform = mult( model_transform, scale(.6,3,.6) );
		this.m_cube.draw( this.graphicsState, model_transform, green );
		model_transform = stack.pop();
		model_transform = mult( model_transform, translation(.1/i, 3, 0) );
		if( i===7 ) continue;
		stack.push(model_transform);		

		model_transform = mult( model_transform, rotation( rotation_dir[i-1], 0, 1, 0) );
		model_transform = mult( model_transform, scale(1.2, 1.5, 1.2) );
		model_transform = mult( model_transform, translation(-Math.sin(rotation_dir[i-1])*.6, 0, -Math.sin(rotation_dir[i-1])*.6) );
		this.m_cone.draw(this.graphicsState, model_transform, leaf);		
		model_transform = stack.pop();
	}
	model_transform = stack.pop()
	return model_transform;		
}

Animation.prototype.drawPlant5 = function(model_transform, texture){
	var stack = [];
	stack.push(model_transform);
	var rotation_dir = [25, 143, 16, 22, 54, 196, 120, 18];

	for( var i = 0; i < 4; i++ ){
		stack.push(model_transform);
		model_transform = mult( model_transform, translation(i, 0, 0) );
		for( var j = 0; j < 4; j++ ){
			stack.push(model_transform);
			model_transform = mult( model_transform, translation(0, 0, j) );
			model_transform = mult( model_transform, scale(.8, 2, .8) );
			model_transform = mult( model_transform, rotation( rotation_dir[i+j], i%2, 1, j%2) );
			this.m_cube.draw( this.graphicsState, model_transform, texture );
			model_transform = stack.pop();
		}
		model_transform = stack.pop();
	}
	model_transform = stack.pop()
	return model_transform;
}

Animation.prototype.drawPlants = function(model_transform){
	var stack = [];
	stack.push(model_transform);

	// between plant near turtle
	model_transform = mult( model_transform, translation(-30, 10, -10) );
	model_transform = mult( model_transform, rotation(-120, 0, 1, 0) );
	this.drawPlant2(model_transform);
	model_transform = stack.pop();

	// middle
	stack.push(model_transform);
	model_transform = mult( model_transform, translation(-20, 10, -50) );
	this.drawPlant3(model_transform);
	model_transform = mult( model_transform, translation(-10, 0, 0) );
	stack.push(model_transform);
	model_transform = mult( model_transform, rotation(60, 0, 1, 0) );
	this.drawPlant3(model_transform);
	model_transform = stack.pop();
	model_transform = mult( model_transform, translation(-7, 0, 12) );
	stack.push(model_transform);
	model_transform = mult( model_transform, rotation(60, 0, 1, 0) );
	this.drawPlant3(model_transform);
	model_transform = stack.pop();
	model_transform = mult( model_transform, translation(30, 0, -30) );
	stack.push(model_transform);
	model_transform = mult( model_transform, rotation(80, 0, 1, 0) );
	this.drawPlant3(model_transform);
	model_transform = stack.pop();

	stack.push(model_transform);
	model_transform = mult( model_transform, translation(15, 5, -45) );
	//model_transform = mult( model_transform, scale(3, 3, 3) );
	this.drawPlant2(model_transform);
	model_transform = stack.pop();

	stack.push(model_transform);
	model_transform = mult( model_transform, translation(30, 4, -40) );
	model_transform = mult( model_transform, scale(3, 3, 3) );
	this.drawPlant4(model_transform);
	model_transform = stack.pop();

	stack.push(model_transform);
	model_transform = mult( model_transform, translation(-30, 9, -40) );
	model_transform = mult( model_transform, scale(3, 12, 3) );
	this.drawPlant5(model_transform, green);
	model_transform = stack.pop();	

	stack.push(model_transform);
	model_transform = mult( model_transform, translation(-40, 9, -40) );
	model_transform = mult( model_transform, scale(3, 12, 3) );
	this.drawPlant5(model_transform, green);
	model_transform = stack.pop();

	stack.push(model_transform);
	model_transform = mult( model_transform, translation(-30, 9, -30) );
	model_transform = mult( model_transform, scale(3, 12, 3) );
	this.drawPlant5(model_transform, green);
	model_transform = stack.pop();	

	stack.push(model_transform);
	model_transform = mult( model_transform, translation(-30, 9, -30) );
	model_transform = mult( model_transform, scale(3, 12, 3) );
	this.drawPlant5(model_transform, green);
	model_transform = stack.pop();

	stack.push(model_transform);
	model_transform = mult( model_transform, translation(40, 12, -20) );
	model_transform = mult( model_transform, scale(3, 15, 3) );
	this.drawPlant5(model_transform, red);
	model_transform = stack.pop();					

	model_transform = stack.pop();
	return model_transform;
}

Animation.prototype.drawRock = function(model_transform){
	var stack = [];
	stack.push(model_transform);

	// tall rock
	model_transform = mult( model_transform, translation( rock_x, rock_y, rock_x) );
	stack.push(model_transform);
	model_transform = mult( model_transform, scale(25, 35, 25) );
	this.m_rock.draw( this.graphicsState, model_transform, l_rock );
	model_transform = stack.pop();

	// append stones to tall rock
	stack.push(model_transform);
	model_transform = mult( model_transform, translation(20, -50, 21) );
	model_transform = mult( model_transform, scale(5, 3, 5) );
	model_transform = mult( model_transform, rotation(90, 0, 0, 1) );
	this.m_stone2.draw( this.graphicsState, model_transform, stone2 );
	model_transform = stack.pop();

		// stone
	stack.push(model_transform);
	model_transform = mult( model_transform, translation(23, -50, 12) );
	stack.push(model_transform); 
	model_transform = mult( model_transform, translation(12, 13, 17) ); // for plant on this stone
	var rotation_dir = [ vec4(12, 1, 0, 1), vec4(43, 1, 1, 0), vec4(77, 0, 1, 1), vec4(82, 1, 0, 0), vec4(29, 0, 1, 0) ];
	this.drawPlant1(model_transform, rotation_dir, 25, red);
	model_transform = stack.pop();
	model_transform = mult( model_transform, scale(6, 4, 6) );
	this.m_stone2.draw( this.graphicsState, model_transform, stone2 );
	model_transform = stack.pop();

		// stone
	stack.push(model_transform);
	model_transform = mult( model_transform, translation(10, 2, 20) );
	stack.push(model_transform); 
	model_transform = mult( model_transform, translation(7, 7, 16) ); // for plant on this stone
	model_transform = mult( model_transform, rotation(90, 1, 0, 0) );
	var rotation_dir = [ vec4(-12, 1, 0, 1), vec4(-43, 1, 1, 0), vec4(-77, 0, 1, 1), vec4(-82, 1, 0, 0), vec4(-29, 0, 1, 0) ];
	this.drawPlant1(model_transform, rotation_dir, 25, green);
	model_transform = stack.pop();	
	model_transform = mult( model_transform, scale(4, 4, 5) );
	this.m_stone2.draw( this.graphicsState, model_transform, stone2 );
	model_transform = stack.pop();

		// stone
	stack.push(model_transform);
	model_transform = mult( model_transform, translation(25, 10, 0) );
	model_transform = mult( model_transform, scale(3, 3, 4) );
	this.m_stone2.draw( this.graphicsState, model_transform, stone2 );
	model_transform = stack.pop();

		// top round stone
	stack.push(model_transform);	
	model_transform = mult( model_transform, translation(0, 60, 0) );
	model_transform = mult( model_transform, scale(60, 8, 65) );
	this.m_sphere.draw( this.graphicsState, model_transform, l_rock );
	model_transform = stack.pop();
	model_transform = stack.pop();

	// other rock
	stack.push(model_transform);
	model_transform = mult( model_transform, translation( -10, 8, -10 ) );
	stack.push(model_transform);
	model_transform = mult( model_transform, scale(10, 13, 10) );
	this.m_stone1.draw( this.graphicsState, model_transform, stone1 );
	model_transform = stack.pop();

	stack.push(model_transform);
	model_transform = mult( model_transform, translation( 0, 1, -20 ) );
	model_transform = mult( model_transform, scale(10, 10, 10) );
	this.m_stone1.draw( this.graphicsState, model_transform, stone1 );
	model_transform = stack.pop();	

	model_transform = mult( model_transform, translation( 20, 5, -15 ) );
	model_transform = mult( model_transform, scale(13, 20, 13) );
	this.m_stone1.draw( this.graphicsState, model_transform, stone1 );
	model_transform = stack.pop();

	// other rock
	stack.push(model_transform);
	model_transform = mult( model_transform, translation( -90, 10, 0 ) );
	stack.push(model_transform);
	model_transform = mult( model_transform, scale(10, 4, 10) );
	this.m_stone2.draw( this.graphicsState, model_transform, stone3 );
	model_transform = stack.pop();

	stack.push(model_transform);
	model_transform = mult( model_transform, translation(0, 13, 10) );
	stack.push(model_transform);
	model_transform = mult( model_transform, scale(20, .5, 20) );
	this.m_sphere.draw( this.graphicsState, model_transform, stone4 );
	model_transform = stack.pop();

	model_transform = mult( model_transform, translation(0, 1, 0) );
	var rotation_dir = [ vec4(22, 1, 0, 0), vec4(30, 0, 0, 1), vec4(43, 0, 1, 0), vec4(74, 0, 0, 1), vec4(82, 1, 0, 0), vec4(29, 0, 1, 0), vec4(60, 1, 0, 0) ];
	this.drawPlant1(model_transform, rotation_dir, 25, red);
	model_transform = mult( model_transform, translation(5, 0, -5) );
	var rotation_dir = [ vec4(22, 1, 0, 0), vec4(30, 0, 0, 1), vec4(43, 0, 1, 0), vec4(74, 0, 0, 1), vec4(82, 1, 0, 0), vec4(29, 0, 1, 0), vec4(60, 1, 0, 0) ];
	this.drawPlant1(model_transform, rotation_dir, 25, red);
	model_transform = mult( model_transform, translation(24, -2, -4) );
	var rotation_dir = [ vec4(22, 1, 0, 0), vec4(30, 0, 0, 1), vec4(43, 0, 1, 0), vec4(74, 0, 0, 1), vec4(82, 1, 0, 0), vec4(29, 0, 1, 0), vec4(60, 1, 0, 0) ];
	this.drawPlant1(model_transform, rotation_dir, 25, green);			
	model_transform = stack.pop();

	model_transform = mult( model_transform, translation(30, 10, 0) );
	model_transform = mult( model_transform, scale(15, .5, 15) );
	this.m_sphere.draw( this.graphicsState, model_transform, stone4 );
	model_transform = stack.pop();



	// rock next to the tall rock
	stack.push(model_transform);
	model_transform = mult( model_transform, translation( -5, 15, -160 ) );
	stack.push(model_transform);
	model_transform = mult( model_transform, rotation(45, 0, 1, 0) );
	model_transform = mult( model_transform, scale(5, 7, 15) );
	this.m_stone2.draw( this.graphicsState, model_transform, stone3 );
	model_transform = stack.pop();

	stack.push(model_transform);
	model_transform = mult( model_transform, translation(0, 13, 10) );
	stack.push(model_transform);
	model_transform = mult( model_transform, scale(20, .5, 20) );
	this.m_sphere.draw( this.graphicsState, model_transform, stone4 );
	model_transform = stack.pop();	

	model_transform = mult( model_transform, translation(5, 7, -3) );
	stack.push(model_transform);
	model_transform = mult( model_transform, scale(20, .5, 20) );
	this.m_sphere.draw( this.graphicsState, model_transform, stone4 );
	model_transform = stack.pop();	

	model_transform = mult( model_transform, translation(5, 5, -10) );
	stack.push(model_transform);
	model_transform = mult( model_transform, scale(20, .5, 20) );
	this.m_sphere.draw( this.graphicsState, model_transform, stone4 );
	model_transform = stack.pop();
	model_transform = mult( model_transform, translation(0, .5, 0) );
	this.drawClam(model_transform, 15);
	model_transform = mult( model_transform, translation(-10, 0, -10) );
	this.drawClam(model_transform, 34);
	model_transform = mult( model_transform, translation(-5, 0, 8) );
	this.drawClam(model_transform, 67);
	model_transform = mult( model_transform, translation(4, 0, 15) );
	this.drawClam(model_transform, 80);
	model_transform = mult( model_transform, translation(17, 0, -23) );
	this.drawClam(model_transform, 129);				


	model_transform = stack.pop();
	return model_transform;	
}

Animation.prototype.drawClam = function(model_transform, rotation_angle){
	var def_tranform = model_transform;
	model_transform = mult( model_transform, rotation( rotation_angle, 0, 1, 0 ) );
	model_transform = mult( model_transform, scale(2, 2, 2) );
	this.m_clam.draw( this.graphicsState, model_transform, clam );
	return def_tranform;
}

Animation.prototype.drawTurtle = function(model_transform){
	var stack = [];

	// shell
	stack.push(model_transform);
	model_transform = mult( model_transform, scale(1, 1.5, 1) );
	this.m_shell.draw( this.graphicsState, model_transform, t_shell );
	model_transform = stack.pop();

	stack.push(model_transform);
	model_transform = mult(model_transform, translation(0, 0, -3.9) );

	// lower body
	stack.push(model_transform);
	model_transform = mult( model_transform, rotation(180, 0, 1, 0) );
	model_transform = mult( model_transform, scale(1.3, 1.8, 1.3) );
	this.m_body.draw( this.graphicsState, model_transform, t_body );
	model_transform = stack.pop();

	// hands
	stack.push(model_transform);
	model_transform = mult( model_transform, translation(1.6, 2, 1) );
	model_transform = mult( model_transform, scale(1.3, 1.3, .6) );
	model_transform = mult( model_transform, rotation(30, 0, 0, 1) );
	model_transform = mult( model_transform, rotation( hand_angle_max * Math.sin(this.graphicsState.animation_time/1000), 0, 0, 1 ) );
	this.m_hand.draw( this.graphicsState, model_transform, t_body );
	model_transform = stack.pop();
	stack.push(model_transform);
	model_transform = mult( model_transform, translation(-1.6, 2, .5) );
	model_transform = mult( model_transform, scale(1.3, 1.3, .6) );
	model_transform = mult( model_transform, rotation(180, 0, 1, 0) );
	model_transform = mult( model_transform, rotation(30, 0, 0, 1) );
	model_transform = mult( model_transform, rotation( hand_angle_max * Math.sin(this.graphicsState.animation_time/1000), 0, 0, 1 ) );
	this.m_hand.draw( this.graphicsState, model_transform, t_body );
	model_transform = stack.pop();

	// legs
	stack.push(model_transform);
	model_transform = mult( model_transform, translation(1.5, -1.8, 1) );
	model_transform = mult( model_transform, scale(1.3, 1.3, .6) );
	model_transform = mult( model_transform, rotation(-20, 0, 0, 1) );
	model_transform = mult( model_transform, rotation( leg_angle_max * Math.sin(this.graphicsState.animation_time/1000), 0, 0, 1 ) );
	this.m_leg.draw( this.graphicsState, model_transform, t_body );
	model_transform = stack.pop();
	stack.push(model_transform);
	model_transform = mult( model_transform, translation(-1.5, -1.8, .5) );
	model_transform = mult( model_transform, scale(1.3, 1.3, .6) );
	model_transform = mult( model_transform, rotation(180, 0, 1, 0) );
	model_transform = mult( model_transform, rotation(-20, 0, 0, 1) );
	model_transform = mult( model_transform, rotation( leg_angle_max * Math.sin(this.graphicsState.animation_time/1000), 0, 0, 1 ) );
	this.m_leg.draw( this.graphicsState, model_transform, t_body );
	model_transform = stack.pop();	

	// head
	stack.push(model_transform);
	model_transform = mult( model_transform, translation(0, 3, 1) );
	model_transform = mult( model_transform, scale(.7, 1.9, .7) );
	model_transform = mult( model_transform, rotation(-90, 1, 0, 0) );
	this.m_capped.draw( this.graphicsState, model_transform, t_body );
	model_transform = stack.pop();		
	stack.push(model_transform);
	model_transform = mult( model_transform, translation(0, 5.3, 1) );
	model_transform = mult( model_transform, scale(1.5, 1.5, 1.5) );
	model_transform = mult( model_transform, rotation(-90, 1, 0, 0) );
	this.m_head.draw( this.graphicsState, model_transform, t_body );
	model_transform = stack.pop();

	// model_transform = stack.pop();
	model_transform = stack.pop();
	return model_transform;	
}