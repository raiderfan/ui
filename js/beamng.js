// od - The object data
var objectData = {};

var state = {'changes':[], 'streams':{}};

var debugObjectData = false;

var sparkPoints = {};

function oUpdate(v)
{
	objectData = v;

	AppEngine.update(v);
}

function updateSparcLines()
{
	if(debugObjectData) {
		var objDataDump = "<h3>Object data</h3><table border='0'>";
		for(attr in objectData) {
			objDataDump += "<tr><td colspan='4'>" + attr + "</td></tr>";
			var keys = Object.keys(objectData[attr]);
			keys.sort();
			for (var i=0; i<keys.length; i++) {
				var attr2 = keys[i];
				objDataDump += "<tr><td width='15'>&nbsp;</td><td>" + attr2 + "</td><td><span id='sl_"+attr2+"'></span></td><td>" + JSON.stringify(objectData[attr][attr2]) + "</td></tr>";
				if(typeof objectData[attr][attr2] == 'number') {
					if(sparkPoints[attr2] === undefined)
						sparkPoints[attr2] = [];
					sparkPoints[attr2].push(objectData[attr][attr2]);
					if (sparkPoints[attr2].length > 40)
						sparkPoints[attr2].shift();
				}
			}
		}
		objDataDump += "</table>";

		$('#objdebug').html(objDataDump);

		for(attr in objectData) {
			for(attr2 in objectData[attr]) {
				if(typeof objectData[attr][attr2] == 'number') {
					$('#sl_'+attr2).sparkline(sparkPoints[attr2], { width: sparkPoints[attr2].length*2, tooltipSuffix: '', disableHiddenCheck:true });
				}
			}
		}
	}
	setTimeout(updateSparcLines, 100);
}

function filledArc(ctx, x, y, r, w, v, c)
{
	if(v > 1) v = 1;
	else if(v < -1) v = -1;
	ctx.beginPath();
	var rads = v * 2 * Math.PI;
	var reverse = (v < 0);
	ctx.arc(x,y,r-(w/2)  , 1.5 * Math.PI, 1.5 * Math.PI + rads, reverse);
	ctx.lineWidth = w;
	ctx.strokeStyle = c;
	ctx.stroke();
	ctx.closePath();
}

function wheelsScreenUpdate(value)
{
	/* value format:
	0  wd.name
	1  wd.radius
	2  wd.wheelDir
	3  w.angularVelocity
	4  w.lastTorque
	5  drivetrain.wheelInfo[wd.wheelID].lastSlip
	6  wd.lastTorqueMode
	*/
	var c = $('#drawCanvas')[0];
	var ctx = c.getContext('2d');

	// clear
	ctx.save();
	ctx.setTransform(1, 0, 0, 1, 0, 0);
	ctx.clearRect(0, 0, c.width, c.height);
	ctx.restore();
	ctx.textAlign = 'center';
	var fontSize = 12;
	ctx.font = 'bold ' + fontSize + 'pt monospace';
	var r = 50;
	var rs = 5;
	var b = 5;
	var x = r + b;
	var y = r + b;
	for(var i in value) {
		var w = value[i];
		// then draw
		ctx.fillText('wheel' + w[0], x, y);
		filledArc(ctx, x, y, r, 1, 1, '#444444');

		var wheelSpeed = w[3] * w[1] * w[2];
		ctx.fillText(Math.floor(wheelSpeed * 3.6) + ' kph'    , x, y + fontSize + 3);
		ctx.fillText(Math.floor(wheelSpeed * 2.23694) + ' mph', x, y + 2 * (fontSize + 3));
		filledArc(ctx, x, y, r - 1, rs, wheelSpeed/33, 'rgb(0,128,128)');

		filledArc(ctx, x, y, r - 1 - rs, rs, w[5]/10 , 'rgb(128,128,0)');
		
		var torque = (w[4] * w[2]) / 10000;
		var col = 'rgb(128,0,128)';
		if(w[6] == 1) {
			col = 'rgb(128,128,0)';
		} else if(w[6] == 2) {
			col = 'rgb(128,0,0)';
		}
		filledArc(ctx, x, y, r - 1 - rs * 2, rs, torque, col);


		x += 2 * r +  5;

		if(x + r >= c.width) {
			x = r + b;
			y += 2 * r + 5;
		}
	}
	y -= r;
	if(c.height < y)
		c.height = y;
}

var rpmGauge;

function engineScreenUpdate(v)
{
	/*
	0   v.data.engine.idleRPM
	1, v.data.engine.maxRPM
	2, v.data.engine.shiftUpRPM
	3, v.data.engine.shiftDownRPM
	4, drivetrain.rpm
	5, drivetrain.gear
	6, v.data.engine.fwdGearCount
	7, v.data.engine.revGearCount
	8, drivetrain.torque
	9, drivetrain.torqueTransmission
	10, obj:getVelocity():length()  -- airspeed
	11, drivetrain.fuel
	12, drivetrain.fuelCapacity
	13, sensors
	14, Settings.gravity	
	*/

	if(rpmGauge === undefined) {
		rpmGauge = new JustGage({
			id: "rpmGauge",
			value: Math.floor(v[4]),
			min: 0,
			max: v[1],
			title: "RPM",
			label: "",
			});
	}

	rpmGauge.refresh(Math.floor(v[4]));

	var s = '';

//	$('#engineInfo_data').html(s);

}


$(document).ready(function() {
	widgetEventHandler(updateSingleValue, 'debug_globalonoff', 'bdebug', 'enabled');
	widgetEventHandler(updateSingleValue, 'skeleton_debug_options', 'bdebug', 'skeleton_mode');
	widgetEventHandler(updateSingleValue, 'nodeinfo_debug_options', 'bdebug', 'node_info_mode');
	widgetEventHandler(updateSingleValue, 'debug_collision_tri', 'bdebug', 'coltrimode');
	widgetEventHandler(updateSingleValue, 'debug_mesh_visibility', 'bdebug', 'mesh_visibility');
	widgetEventHandler(updateSingleValue, 'option_simspeed', 'bullettime', 'wantedSimulationSpeed');

	widgetEventHandler(updateGameEngineValue, 'debug_render_bb', '$Scene::renderBoundingBoxes');
	widgetEventHandler(updateGameEngineValue, 'debug_render_shadows', '$Shadows::disable');
	widgetEventHandler(updateGameEngineValue, 'debug_render_wireframe', '$gfx::wireframe');
	
	widgetEventHandler(callGameEngineFunc, 'debug_render_depthviz', 'toggleDepthViz');
	widgetEventHandler(callGameEngineFunc, 'debug_render_normalviz', 'toggleNormalsViz');
	widgetEventHandler(callGameEngineFunc, 'debug_render_lightcolorviz', 'toggleLightColorViz');
	widgetEventHandler(callGameEngineFunc, 'debug_render_lightspecviz', 'toggleLightSpecularViz');


	// special
	$('#debug_object_data').change(function(e) {
		debugObjectData = $(this).is(':checked');
		//alert(debugObjectData)
		if(!debugObjectData) {
			$('#objdebug').html();
			$('#objdebug').css('visibility', 'hidden');
			streamRemove('electrics');
		} else {
			$('#objdebug').css('visibility', 'visible');
			streamAdd('electrics');
		}
		return true;
	});

	setTimeout(updateSparcLines, 10);
});

/***********************************************************************************************/

function sendObjectState()
{
	cmd = "guiUpdate(" + serializeToLua(state) + ")";
	//alert(cmd);
	if(typeof beamng === 'object') {
		beamng.sendActiveObjectLua(cmd);
	} else {
		console.log(state);
		console.log(cmd);
	}

	state['changes'] = [];
	return true;
}

function serializeToLua(obj)
{
	if(obj === undefined) return ''; //nil';
	switch(obj.constructor) {
		case String:
			return '"' + obj + '"';
		case Number:
			return isFinite(obj) ? obj.toString() : null;
		case Boolean:
			return obj ? 'true' : 'false';
		case Array:
			var tmp = [];
			for(var i = 0; i < obj.length; i++)
			{
				tmp.push(serializeToLua(obj[i]));
			}
			return '{' + tmp.join(',') + '}';
		default:
			if(typeof obj == "object")
			{
				var tmp = [];
				for(attr in obj)
				{
					if(typeof obj[attr] != "function")
						tmp.push('' + attr + '=' + serializeToLua(obj[attr]));
				}
				return '{' + tmp.join(',') + '}';
			} else {
				return obj.toString();
			}
	}
}

function streamAdd(streamName)
{
	if (state.streams[streamName]===undefined){
		state.streams[streamName] = 1;
	}else{
		state.streams[streamName] += 1;
	}
	state['changes'].push('streams');
	sendObjectState();
	console.log("Stream '"+streamName+"' added, Count: "+state.streams[streamName]);
	console.log(JSON.stringify(state.streams));
}

function streamRemove(streamName)
{
	state.streams[streamName] -= 1;
	if (state.streams[streamName] < 0) {
		state.streams[streamName] = 0;
	}else{
		state['changes'].push('streams');
		sendObjectState();
	}
	console.log("Stream '"+streamName+"' removed, Count: "+state.streams[streamName]);
}


// listens on the collapsible events
function collapsibleStreamEventHandler(name, streamName)
{
	if(streamName === undefined) streamName = name;
	var dataRole = $("#" + name).attr('data-role');
	if(dataRole == 'collapsible') {
		$("#" + name).collapsible({
			collapse: function( event, ui ) {
				streamRemove(streamName);
			},
			expand: function( event, ui ) {
				streamAdd(streamName);
			}
		});	
	} else if(dataRole == 'panel') {
		$("#" + name).panel({
			open: function( event, ui ) {
				streamAdd(streamName);
			},
			close: function( event, ui ) {
				streamRemove(streamName);
			}
		});
	}
}

function updateGameEngineValue(key, value)
{
	beamng.sendGameEngine(key + "=" + value + ";");
}

function callGameEngineFunc(func)
{
	beamng.sendGameEngine(func + "();");
}

function updateSingleValue(module, key, value)
{
	if(state[module] === undefined) {
		state[module] = {};
	}

	state[module][key] = value;

	state['changes'].push(module);

	sendObjectState();
}

// this function registers the controls and forwards changes to lua
function widgetEventHandler()
{
	// default args normally: func, widgetName, varname, ...
	var func = arguments[0];
	var widgetName = arguments[1];
	var funcArgs = Array.prototype.slice.call(arguments, 2);
	var c = $('#'+widgetName);
	var tagName = c.prop("tagName");
	if(tagName == 'INPUT') {
		var ctrlType = c.attr('data-type') || c.attr('type');
		if(ctrlType == 'checkbox') {
			c.change(function(e) {
				var funcArgsNow = funcArgs.slice(0);
				funcArgsNow.push($(this).is(':checked'));
				return func.apply(this, funcArgsNow);
			});
			return true;
		} else if(ctrlType == 'range') {
			c.change(function(e) {
				var funcArgsNow = funcArgs.slice(0);
				funcArgsNow.push($(this).val());
				return func.apply(this, funcArgsNow);
			});
			return true;
		} else if(ctrlType == 'button') {
			c.click(function(e) {
				return func.apply(this, funcArgs);
			});
			return true;
		}
	} else if(tagName == 'SELECT') {
		c.change(function(e) {
			var funcArgsNow = funcArgs.slice(0);
			funcArgsNow.push($(this).val());
			return func.apply(this, funcArgsNow);
		});
		return true;
	} else if(tagName == 'FIELDSET') {
		c = $('input[name='+widgetName+']');
		var ctrlType = c.attr('data-type') || c.attr('type');
		if(ctrlType == 'radio') {
			c.change(function(e) {
				var ctrl = $( 'input[name='+widgetName+']:checked' );
				var v = ctrl.val();
				if(ctrl.attr('value-is-numeric') !== undefined);
					v = +v;
				var funcArgsNow = funcArgs.slice(0);
				funcArgsNow.push(v);
				return func.apply(this, funcArgsNow);
			});
			return true;
		}
	}
	alert("control not bound: " + widgetName);
}

// ----ONLY FOR BROWSERTESTING---------------------------------------------------------------------------------------------------------
function test()
{
 oUpdate({"electrics":{"lowfuel":0,"american_taillight_L":0,"watertemp":0.4,"brake_input":0,"oiltemp":0.3,"parking":0,"driveshaft":98.314238955321,"signal_L":0,"signal_R":0,"reverse":0,"blinkPulse":0,"parkingbrake_input":0,"steering":-0,"clutch_input":0,"parkingbrake":0,"throttle_input":0,"lowhighbeam":0,"abs":0,"lowpressure":0,"rpm":537.72845438927,"checkengine":0,"gear_M":6.7532711376141e-035,"clutch":0,"gear_A":0.4,"american_taillight_R":0,"airspeed":1.2411048868436,"steering_input":7.61292,"altitude":0.35428247874325,"rpmspin":205.77032002941,"brake":0,"fuel":0.99887505956034,"lights":0,"axle":98.314238955321,"turnsignal":0,"throttle":0}, "vehicleInfo":[[["front",4,1,3,345,4,1],["back",4,1,3,345,4,1]],[500,7000,4000,1000,2456,3,5,1,43563,345,49,3,2,{},-9.81]]});
}