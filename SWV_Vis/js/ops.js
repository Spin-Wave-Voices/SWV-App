"use strict";

var CABLES=CABLES||{};
CABLES.OPS=CABLES.OPS||{};

var Ops=Ops || {};
Ops.Gl=Ops.Gl || {};
Ops.Math=Ops.Math || {};
Ops.Array=Ops.Array || {};
Ops.Boolean=Ops.Boolean || {};
Ops.Devices=Ops.Devices || {};
Ops.Trigger=Ops.Trigger || {};
Ops.Gl.Matrix=Ops.Gl.Matrix || {};
Ops.Gl.Meshes=Ops.Gl.Meshes || {};
Ops.Gl.Shader=Ops.Gl.Shader || {};
Ops.Deprecated=Ops.Deprecated || {};
Ops.Devices.Midi=Ops.Devices.Midi || {};
Ops.Math.Compare=Ops.Math.Compare || {};
Ops.Devices.Keyboard=Ops.Devices.Keyboard || {};
Ops.Gl.ShaderEffects=Ops.Gl.ShaderEffects || {};
Ops.Deprecated.Number=Ops.Deprecated.Number || {};



// **************************************************************
// 
// Ops.Gl.MainLoop
// 
// **************************************************************

Ops.Gl.MainLoop = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments=op.attachments={};
const
    fpsLimit = op.inValue("FPS Limit", 0),
    trigger = op.outTrigger("trigger"),
    width = op.outNumber("width"),
    height = op.outNumber("height"),
    reduceFocusFPS = op.inValueBool("Reduce FPS not focussed", true),
    reduceLoadingFPS = op.inValueBool("Reduce FPS loading"),
    clear = op.inValueBool("Clear", true),
    clearAlpha = op.inValueBool("ClearAlpha", true),
    fullscreen = op.inValueBool("Fullscreen Button", false),
    active = op.inValueBool("Active", true),
    hdpi = op.inValueBool("Hires Displays", false),
    inUnit = op.inSwitch("Pixel Unit", ["Display", "CSS"], "Display");

op.onAnimFrame = render;
hdpi.onChange = function ()
{
    if (hdpi.get()) op.patch.cgl.pixelDensity = window.devicePixelRatio;
    else op.patch.cgl.pixelDensity = 1;

    op.patch.cgl.updateSize();
    if (CABLES.UI) gui.setLayout();
};

active.onChange = function ()
{
    op.patch.removeOnAnimFrame(op);

    if (active.get())
    {
        op.setUiAttrib({ "extendTitle": "" });
        op.onAnimFrame = render;
        op.patch.addOnAnimFrame(op);
        op.log("adding again!");
    }
    else
    {
        op.setUiAttrib({ "extendTitle": "Inactive" });
    }
};

const cgl = op.patch.cgl;
let rframes = 0;
let rframeStart = 0;
let timeOutTest = null;
let addedListener = false;

if (!op.patch.cgl) op.uiAttr({ "error": "No webgl cgl context" });

const identTranslate = vec3.create();
vec3.set(identTranslate, 0, 0, 0);
const identTranslateView = vec3.create();
vec3.set(identTranslateView, 0, 0, -2);

fullscreen.onChange = updateFullscreenButton;
setTimeout(updateFullscreenButton, 100);
let fsElement = null;

let winhasFocus = true;
let winVisible = true;

window.addEventListener("blur", () => { winhasFocus = false; });
window.addEventListener("focus", () => { winhasFocus = true; });
document.addEventListener("visibilitychange", () => { winVisible = !document.hidden; });
testMultiMainloop();

cgl.mainloopOp = this;

inUnit.onChange = () =>
{
    width.set(0);
    height.set(0);
};

function getFpsLimit()
{
    if (reduceLoadingFPS.get() && op.patch.loading.getProgress() < 1.0) return 5;

    if (reduceFocusFPS.get())
    {
        if (!winVisible) return 10;
        if (!winhasFocus) return 30;
    }

    return fpsLimit.get();
}

function updateFullscreenButton()
{
    function onMouseEnter()
    {
        if (fsElement)fsElement.style.display = "block";
    }

    function onMouseLeave()
    {
        if (fsElement)fsElement.style.display = "none";
    }

    op.patch.cgl.canvas.addEventListener("mouseleave", onMouseLeave);
    op.patch.cgl.canvas.addEventListener("mouseenter", onMouseEnter);

    if (fullscreen.get())
    {
        if (!fsElement)
        {
            fsElement = document.createElement("div");

            const container = op.patch.cgl.canvas.parentElement;
            if (container)container.appendChild(fsElement);

            fsElement.addEventListener("mouseenter", onMouseEnter);
            fsElement.addEventListener("click", function (e)
            {
                if (CABLES.UI && !e.shiftKey) gui.cycleFullscreen();
                else cgl.fullScreen();
            });
        }

        fsElement.style.padding = "10px";
        fsElement.style.position = "absolute";
        fsElement.style.right = "5px";
        fsElement.style.top = "5px";
        fsElement.style.width = "20px";
        fsElement.style.height = "20px";
        fsElement.style.cursor = "pointer";
        fsElement.style["border-radius"] = "40px";
        fsElement.style.background = "#444";
        fsElement.style["z-index"] = "9999";
        fsElement.style.display = "none";
        fsElement.innerHTML = "<svg xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" version=\"1.1\" id=\"Capa_1\" x=\"0px\" y=\"0px\" viewBox=\"0 0 490 490\" style=\"width:20px;height:20px;\" xml:space=\"preserve\" width=\"512px\" height=\"512px\"><g><path d=\"M173.792,301.792L21.333,454.251v-80.917c0-5.891-4.776-10.667-10.667-10.667C4.776,362.667,0,367.442,0,373.333V480     c0,5.891,4.776,10.667,10.667,10.667h106.667c5.891,0,10.667-4.776,10.667-10.667s-4.776-10.667-10.667-10.667H36.416     l152.459-152.459c4.093-4.237,3.975-10.99-0.262-15.083C184.479,297.799,177.926,297.799,173.792,301.792z\" fill=\"#FFFFFF\"/><path d=\"M480,0H373.333c-5.891,0-10.667,4.776-10.667,10.667c0,5.891,4.776,10.667,10.667,10.667h80.917L301.792,173.792     c-4.237,4.093-4.354,10.845-0.262,15.083c4.093,4.237,10.845,4.354,15.083,0.262c0.089-0.086,0.176-0.173,0.262-0.262     L469.333,36.416v80.917c0,5.891,4.776,10.667,10.667,10.667s10.667-4.776,10.667-10.667V10.667C490.667,4.776,485.891,0,480,0z\" fill=\"#FFFFFF\"/><path d=\"M36.416,21.333h80.917c5.891,0,10.667-4.776,10.667-10.667C128,4.776,123.224,0,117.333,0H10.667     C4.776,0,0,4.776,0,10.667v106.667C0,123.224,4.776,128,10.667,128c5.891,0,10.667-4.776,10.667-10.667V36.416l152.459,152.459     c4.237,4.093,10.99,3.975,15.083-0.262c3.992-4.134,3.992-10.687,0-14.82L36.416,21.333z\" fill=\"#FFFFFF\"/><path d=\"M480,362.667c-5.891,0-10.667,4.776-10.667,10.667v80.917L316.875,301.792c-4.237-4.093-10.99-3.976-15.083,0.261     c-3.993,4.134-3.993,10.688,0,14.821l152.459,152.459h-80.917c-5.891,0-10.667,4.776-10.667,10.667s4.776,10.667,10.667,10.667     H480c5.891,0,10.667-4.776,10.667-10.667V373.333C490.667,367.442,485.891,362.667,480,362.667z\" fill=\"#FFFFFF\"/></g></svg>";
    }
    else
    {
        if (fsElement)
        {
            fsElement.style.display = "none";
            fsElement.remove();
            fsElement = null;
        }
    }
}

op.onDelete = function ()
{
    cgl.gl.clearColor(0, 0, 0, 0);
    cgl.gl.clear(cgl.gl.COLOR_BUFFER_BIT | cgl.gl.DEPTH_BUFFER_BIT);
};

function render(time)
{
    if (!active.get()) return;
    if (cgl.aborted || cgl.canvas.clientWidth === 0 || cgl.canvas.clientHeight === 0) return;

    op.patch.cg = cgl;

    if (hdpi.get())op.patch.cgl.pixelDensity = window.devicePixelRatio;

    const startTime = performance.now();

    op.patch.config.fpsLimit = getFpsLimit();

    if (cgl.canvasWidth == -1)
    {
        cgl.setCanvas(op.patch.config.glCanvasId);
        return;
    }

    if (cgl.canvasWidth != width.get() || cgl.canvasHeight != height.get())
    {
        let div = 1;
        if (inUnit.get() == "CSS")div = op.patch.cgl.pixelDensity;

        width.set(cgl.canvasWidth / div);
        height.set(cgl.canvasHeight / div);
    }

    if (CABLES.now() - rframeStart > 1000)
    {
        CGL.fpsReport = CGL.fpsReport || [];
        if (op.patch.loading.getProgress() >= 1.0 && rframeStart !== 0)CGL.fpsReport.push(rframes);
        rframes = 0;
        rframeStart = CABLES.now();
    }
    CGL.MESH.lastShader = null;
    CGL.MESH.lastMesh = null;

    cgl.renderStart(cgl, identTranslate, identTranslateView);

    if (clear.get())
    {
        cgl.gl.clearColor(0, 0, 0, 1);
        cgl.gl.clear(cgl.gl.COLOR_BUFFER_BIT | cgl.gl.DEPTH_BUFFER_BIT);
    }

    trigger.trigger();

    if (CGL.MESH.lastMesh)CGL.MESH.lastMesh.unBind();

    if (CGL.Texture.previewTexture)
    {
        if (!CGL.Texture.texturePreviewer) CGL.Texture.texturePreviewer = new CGL.Texture.texturePreview(cgl);
        CGL.Texture.texturePreviewer.render(CGL.Texture.previewTexture);
    }
    cgl.renderEnd(cgl);

    op.patch.cg = null;

    if (clearAlpha.get())
    {
        cgl.gl.clearColor(1, 1, 1, 1);
        cgl.gl.colorMask(false, false, false, true);
        cgl.gl.clear(cgl.gl.COLOR_BUFFER_BIT);
        cgl.gl.colorMask(true, true, true, true);
    }

    if (!cgl.frameStore.phong)cgl.frameStore.phong = {};
    rframes++;

    op.patch.cgl.profileData.profileMainloopMs = performance.now() - startTime;
}

function testMultiMainloop()
{
    clearTimeout(timeOutTest);
    timeOutTest = setTimeout(
        () =>
        {
            if (op.patch.getOpsByObjName(op.name).length > 1)
            {
                op.setUiError("multimainloop", "there should only be one mainloop op!");
                if (!addedListener)addedListener = op.patch.addEventListener("onOpDelete", testMultiMainloop);
            }
            else op.setUiError("multimainloop", null, 1);
        }, 500);
}


};

Ops.Gl.MainLoop.prototype = new CABLES.Op();
CABLES.OPS["b0472a1d-db16-4ba6-8787-f300fbdc77bb"]={f:Ops.Gl.MainLoop,objName:"Ops.Gl.MainLoop"};




// **************************************************************
// 
// Ops.Gl.Matrix.Transform
// 
// **************************************************************

Ops.Gl.Matrix.Transform = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments=op.attachments={};
const
    render = op.inTrigger("render"),
    posX = op.inValue("posX", 0),
    posY = op.inValue("posY", 0),
    posZ = op.inValue("posZ", 0),
    scale = op.inValue("scale", 1),
    rotX = op.inValue("rotX", 0),
    rotY = op.inValue("rotY", 0),
    rotZ = op.inValue("rotZ", 0),
    trigger = op.outTrigger("trigger");

op.setPortGroup("Rotation", [rotX, rotY, rotZ]);
op.setPortGroup("Position", [posX, posY, posZ]);
op.setPortGroup("Scale", [scale]);
op.setUiAxisPorts(posX, posY, posZ);

op.toWorkPortsNeedToBeLinked(render, trigger);

const vPos = vec3.create();
const vScale = vec3.create();
const transMatrix = mat4.create();
mat4.identity(transMatrix);

let
    doScale = false,
    doTranslate = false,
    translationChanged = true,
    scaleChanged = true,
    rotChanged = true;

rotX.onChange = rotY.onChange = rotZ.onChange = setRotChanged;
posX.onChange = posY.onChange = posZ.onChange = setTranslateChanged;
scale.onChange = setScaleChanged;

render.onTriggered = function ()
{
    // if(!CGL.TextureEffect.checkOpNotInTextureEffect(op)) return;

    let updateMatrix = false;
    if (translationChanged)
    {
        updateTranslation();
        updateMatrix = true;
    }
    if (scaleChanged)
    {
        updateScale();
        updateMatrix = true;
    }
    if (rotChanged) updateMatrix = true;

    if (updateMatrix) doUpdateMatrix();

    const cg = op.patch.cg || op.patch.cgl;
    cg.pushModelMatrix();
    mat4.multiply(cg.mMatrix, cg.mMatrix, transMatrix);

    trigger.trigger();
    cg.popModelMatrix();

    if (CABLES.UI && CABLES.UI.showCanvasTransforms) gui.setTransform(op.id, posX.get(), posY.get(), posZ.get());

    if (op.isCurrentUiOp())
        gui.setTransformGizmo(
            {
                "posX": posX,
                "posY": posY,
                "posZ": posZ,
            });
};

op.transform3d = function ()
{
    return { "pos": [posX, posY, posZ] };
};

function doUpdateMatrix()
{
    mat4.identity(transMatrix);
    if (doTranslate)mat4.translate(transMatrix, transMatrix, vPos);

    if (rotX.get() !== 0)mat4.rotateX(transMatrix, transMatrix, rotX.get() * CGL.DEG2RAD);
    if (rotY.get() !== 0)mat4.rotateY(transMatrix, transMatrix, rotY.get() * CGL.DEG2RAD);
    if (rotZ.get() !== 0)mat4.rotateZ(transMatrix, transMatrix, rotZ.get() * CGL.DEG2RAD);

    if (doScale)mat4.scale(transMatrix, transMatrix, vScale);
    rotChanged = false;
}

function updateTranslation()
{
    doTranslate = false;
    if (posX.get() !== 0.0 || posY.get() !== 0.0 || posZ.get() !== 0.0) doTranslate = true;
    vec3.set(vPos, posX.get(), posY.get(), posZ.get());
    translationChanged = false;
}

function updateScale()
{
    // doScale=false;
    // if(scale.get()!==0.0)
    doScale = true;
    vec3.set(vScale, scale.get(), scale.get(), scale.get());
    scaleChanged = false;
}

function setTranslateChanged()
{
    translationChanged = true;
}

function setScaleChanged()
{
    scaleChanged = true;
}

function setRotChanged()
{
    rotChanged = true;
}

doUpdateMatrix();


};

Ops.Gl.Matrix.Transform.prototype = new CABLES.Op();
CABLES.OPS["650baeb1-db2d-4781-9af6-ab4e9d4277be"]={f:Ops.Gl.Matrix.Transform,objName:"Ops.Gl.Matrix.Transform"};




// **************************************************************
// 
// Ops.Gl.ShaderEffects.VertexDisplacementMap_v4
// 
// **************************************************************

Ops.Gl.ShaderEffects.VertexDisplacementMap_v4 = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments=op.attachments={"vertdisplace_body_vert":"\nvec2 MOD_tc=texCoord;\n\n#ifdef MOD_COORD_MESHXY\n    MOD_tc=pos.xy;\n#endif\n#ifdef MOD_COORD_MESHXZ\n    MOD_tc=pos.xz;\n#endif\n\n\n#ifdef MOD_FLIP_Y\n    MOD_tc.y=1.0-MOD_tc.y;\n#endif\n#ifdef MOD_FLIP_X\n    MOD_tc.x=1.0-MOD_tc.x;\n#endif\n#ifdef MOD_FLIP_XY\n    MOD_tc=1.0-MOD_tc;\n#endif\n\nMOD_tc*=MOD_scale;\n\nvec4 MOD_sample=texture( MOD_texture, vec2(MOD_tc.x+MOD_offsetX,MOD_tc.y+MOD_offsetY) );\nvec3 MOD_disp;\n\n#ifdef MOD_INPUT_R\n    MOD_disp=vec3(MOD_sample.r);\n#endif\n#ifdef MOD_INPUT_G\n    MOD_disp=vec3(MOD_sample.g);\n#endif\n#ifdef MOD_INPUT_B\n    MOD_disp=vec3(MOD_sample.b);\n#endif\n#ifdef MOD_INPUT_A\n    MOD_disp=vec3(MOD_sample.a);\n#endif\n#ifdef MOD_INPUT_RGB\n    MOD_disp=MOD_sample.rgb;\n#endif\n#ifdef MOD_INPUT_LUMI\n    MOD_disp=vec3(dot(vec3(0.2126,0.7152,0.0722), MOD_sample.rgb));\n#endif\n\n\n\n#ifdef MOD_HEIGHTMAP_INVERT\n   MOD_disp=1.0-MOD_disp;\n#endif\n// #ifdef MOD_HEIGHTMAP_NORMALIZE\n//   MOD_disp-=0.5;\n//   MOD_disp*=2.0;\n// #endif\n\n\n#ifdef MOD_HEIGHTMAP_NORMALIZE\n    MOD_disp=(MOD_disp-0.5)*2.0;\n    // MOD_disp=(MOD_disp-0.5)*-1.0+0.5;\n#endif\n\n\nfloat MOD_zero=0.0;\n\n#ifdef MOD_MODE_DIV\n    MOD_zero=1.0;\n#endif\n#ifdef MOD_MODE_MUL\n    MOD_zero=1.0;\n#endif\n\n\n\nvec3 MOD_mask=vec3(1.0);\n\n#ifdef MOD_AXIS_X\n    MOD_mask=vec3(1.,0.,0.);\n    MOD_disp*=MOD_mask*MOD_extrude;\n#endif\n#ifdef MOD_AXIS_Y\n    MOD_mask=vec3(0.,1.,0.);\n    MOD_disp*=MOD_mask*MOD_extrude;\n#endif\n#ifdef MOD_AXIS_Z\n    MOD_mask=vec3(0.,0.,1.);\n    MOD_disp*=MOD_mask*MOD_extrude;\n#endif\n#ifdef MOD_AXIS_XY\n    MOD_mask=vec3(1.,1.,0.);\n    MOD_disp*=MOD_mask*MOD_extrude;\n#endif\n#ifdef MOD_AXIS_XYZ\n    MOD_mask=vec3(1.,1.,1.);\n    MOD_disp*=MOD_mask*MOD_extrude;\n#endif\n\n\n// MOD_disp=smoothstep(-1.,1.,MOD_disp*MOD_disp*MOD_disp);\n// MOD_disp=MOD_disp*MOD_disp*MOD_disp;\n\n// #ifdef MOD_FLIP_Y\n//     MOD_mask.y=1.0-MOD_mask.y;\n// #endif\n// #ifdef MOD_FLIP_X\n//     MOD_mask.x=1.0-MOD_mask.x;\n// #endif\n// #ifdef MOD_FLIP_XY\n//     MOD_mask.xy=1.0-MOD_mask.xy;\n// #endif\n\n\n\n#ifdef MOD_MODE_DIV\n    pos.xyz/=MOD_disp*MOD_mask;\n#endif\n\n#ifdef MOD_MODE_MUL\n    pos.xyz*=MOD_disp*MOD_mask;\n#endif\n\n#ifdef MOD_MODE_ADD\n    pos.xyz+=MOD_disp*MOD_mask;\n#endif\n\n#ifdef MOD_MODE_NORMAL\n\n    vec3 MOD_t=norm;\n    #ifdef MOD_SMOOTHSTEP\n        MOD_t=smoothstep(-1.,1.,MOD_t);\n    #endif\n\n    pos.xyz+=MOD_t*MOD_disp*MOD_mask;\n\n#endif\n\n#ifdef MOD_MODE_TANGENT\n    MOD_disp*=-1.0;\n\n    vec3 MOD_t=attrTangent;\n    #ifdef MOD_SMOOTHSTEP\n        MOD_t=smoothstep(-1.,1.,MOD_t);\n    #endif\n\n    pos.xyz+=MOD_t*MOD_disp*MOD_mask;\n\n#endif\n\n#ifdef MOD_MODE_BITANGENT\n    MOD_disp*=-1.0;\n    vec3 MOD_t=attrBiTangent;\n\n    #ifdef MOD_SMOOTHSTEP\n        MOD_t=smoothstep(-1.,1.,MOD_t);\n    #endif\n\n    pos.xyz+=MOD_t*MOD_disp*MOD_mask;\n\n#endif\n\n#ifdef MOD_MODE_VERTCOL\n    vec3 MOD_t=attrVertColor.rgb*vec3(2.0)-vec3(1.0);\n\n    #ifdef MOD_SMOOTHSTEP\n        MOD_t=smoothstep(-1.,1.,MOD_t);\n    #endif\n\n    pos.xyz+=MOD_t*MOD_disp*MOD_mask;\n\n#endif\n\n\n// pos.y*=-1.0;\n    // pos.xy+=vec2(MOD_texVal*MOD_extrude)*normalize(pos.xy);\n\n\nMOD_displHeightMapColor=MOD_disp;\n\n\n#ifdef MOD_CALC_NORMALS\n    norm+=MOD_calcNormal(MOD_texture,MOD_tc);\n#endif","vertdisplace_head_vert":"OUT vec3 MOD_displHeightMapColor;\n\n#ifdef MOD_MODE_VERTCOL\n#ifndef VERTEX_COLORS\nIN vec4 attrVertColor;\n#endif\n#endif\n\n// mat4 rotationX( in float angle ) {\n// \treturn mat4(\t1.0,\t\t0,\t\t\t0,\t\t\t0,\n// \t\t\t \t\t0, \tcos(angle),\t-sin(angle),\t\t0,\n// \t\t\t\t\t0, \tsin(angle),\t cos(angle),\t\t0,\n// \t\t\t\t\t0, \t\t\t0,\t\t\t  0, \t\t1);\n// }\n\n// mat4 rotationY( in float angle ) {\n// \treturn mat4(\tcos(angle),\t\t0,\t\tsin(angle),\t0,\n// \t\t\t \t\t\t\t0,\t\t1.0,\t\t\t 0,\t0,\n// \t\t\t\t\t-sin(angle),\t0,\t\tcos(angle),\t0,\n// \t\t\t\t\t\t\t0, \t\t0,\t\t\t\t0,\t1);\n// }\n\n// mat4 rotationZ( in float angle ) {\n// \treturn mat4(\tcos(angle),\t\t-sin(angle),\t0,\t0,\n// \t\t\t \t\tsin(angle),\t\tcos(angle),\t\t0,\t0,\n// \t\t\t\t\t\t\t0,\t\t\t\t0,\t\t1,\t0,\n// \t\t\t\t\t\t\t0,\t\t\t\t0,\t\t0,\t1);\n// }\n\n\nvec3 MOD_calcNormal(sampler2D tex,vec2 uv)\n{\n    float strength=13.0;\n    // float texelSize=1.0/float(textureSize(tex,0).x); // not on linux intel?!\n    float texelSize=1.0/512.0;\n\n    float tl = abs(texture(tex, uv + texelSize * vec2(-1.0, -1.0)).x);   // top left\n    float  l = abs(texture(tex, uv + texelSize * vec2(-1.0,  0.0)).x);   // left\n    float bl = abs(texture(tex, uv + texelSize * vec2(-1.0,  1.0)).x);   // bottom left\n    float  t = abs(texture(tex, uv + texelSize * vec2( 0.0, -1.0)).x);   // top\n    float  b = abs(texture(tex, uv + texelSize * vec2( 0.0,  1.0)).x);   // bottom\n    float tr = abs(texture(tex, uv + texelSize * vec2( 1.0, -1.0)).x);   // top right\n    float  r = abs(texture(tex, uv + texelSize * vec2( 1.0,  0.0)).x);   // right\n    float br = abs(texture(tex, uv + texelSize * vec2( 1.0,  1.0)).x);   // bottom right\n\n    //     // Compute dx using Sobel:\n    //     //           -1 0 1\n    //     //           -2 0 2\n    //     //           -1 0 1\n    float dX = tr + 2.0*r + br -tl - 2.0*l - bl;\n\n    //     // Compute dy using Sobel:\n    //     //           -1 -2 -1\n    //     //            0  0  0\n    //     //            1  2  1\n    float dY = bl + 2.0*b + br -tl - 2.0*t - tr;\n\n    //     // Build the normalized normal\n\nvec3 N;\n\n#ifdef MOD_NORMALS_Z\n    N = normalize(vec3(dX,dY, 1.0 / strength));\n#endif\n\n#ifdef MOD_NORMALS_Y\n    N = normalize(vec3(dX,1.0/strength,dY));\n#endif\n#ifdef MOD_NORMALS_X\n    N = normalize(vec3(1.0/strength,dX,dY));\n#endif\n// N*=-1.0;\n// N= N * 0.5 + 0.5;\n\n\n   return N;\n}\n",};
const
    render = op.inTrigger("Render"),
    extrude = op.inValue("Extrude", 0.5),
    meth = op.inSwitch("Mode", ["Norm", "Tang", "BiTang", "VertCol", "*", "+", "/"], "Norm"),
    axis = op.inSwitch("Axis", ["XYZ", "XY", "X", "Y", "Z"], "XYZ"),
    src = op.inSwitch("Coordinates", ["Tex Coords", "Mesh XY", "Mesh XZ"], "Tex Coords"),

    texture = op.inTexture("Texture", null, "texture"),
    channel = op.inSwitch("Channel", ["Luminance", "R", "G", "B", "A", "RGB"], "Luminance"),
    flip = op.inSwitch("Flip", ["None", "X", "Y", "XY"], "None"),
    range = op.inSwitch("Range", ["0-1", "1-0", "Normalized"], "0-1"),
    offsetX = op.inValueFloat("Offset X"),
    offsetY = op.inValueFloat("Offset Y"),
    scale = op.inValueFloat("Scale", 1),

    calcNormals = op.inValueBool("Calc Normals", false),
    calcNormalsAxis = op.inSwitch("Normal Axis", ["X", "Y", "Z"], "Z"),
    removeZero = op.inValueBool("Discard Zero Values"),
    colorize = op.inValueBool("colorize", false),
    colorizeMin = op.inValueSlider("Colorize Min", 0),
    colorizeMax = op.inValueSlider("Colorize Max", 1),
    next = op.outTrigger("trigger");

const cgl = op.patch.cgl;

op.setPortGroup("Input", [texture, flip, channel, range, offsetX, offsetY, scale]);
op.setPortGroup("Colorize", [colorize, colorizeMin, colorizeMax, removeZero]);

op.toWorkPortsNeedToBeLinked(texture, next, render);

render.onTriggered = dorender;

channel.onChange =
    src.onChange =
    axis.onChange =
    flip.onChange =
    meth.onChange =
    range.onChange =
    colorize.onChange =
    removeZero.onChange =
    calcNormals.onChange =
    calcNormalsAxis.onChange = updateDefines;

const srcHeadVert = attachments.vertdisplace_head_vert;
const srcBodyVert = attachments.vertdisplace_body_vert;

const srcHeadFrag = ""
    .endl() + "IN vec3 MOD_displHeightMapColor;"
    .endl() + "vec3 MOD_map(vec3 value, float inMin, float inMax, float outMin, float outMax) { return outMin + (outMax - outMin) * (value - inMin) / (inMax - inMin);}"

    .endl();

const srcBodyFrag = ""
    .endl() + "#ifdef MOD_HEIGHTMAP_COLORIZE"
    .endl() + "   col.rgb*=MOD_map( MOD_displHeightMapColor, 0.0,1.0 , MOD_colorizeMin,MOD_colorizeMax);"
    .endl() + "#endif"
    .endl() + "#ifdef MOD_DISPLACE_REMOVE_ZERO"
    .endl() + "   if(MOD_displHeightMapColor.r==0.0)discard;"
    .endl() + "#endif"
    .endl();

const mod = new CGL.ShaderModifier(cgl, op.name, { "opId": op.id });
mod.addModule({
    "title": op.name,
    "name": "MODULE_VERTEX_POSITION",
    "srcHeadVert": srcHeadVert,
    "srcBodyVert": srcBodyVert
});

mod.addModule({
    "title": op.name,
    "name": "MODULE_COLOR",
    "srcHeadFrag": srcHeadFrag,
    "srcBodyFrag": srcBodyFrag
});

mod.addUniformVert("t", "MOD_texture", 0);
mod.addUniformVert("f", "MOD_extrude", extrude);
mod.addUniformVert("f", "MOD_offsetX", offsetX);
mod.addUniformVert("f", "MOD_offsetY", offsetY);
mod.addUniformVert("f", "MOD_scale", scale);

mod.addUniformFrag("f", "MOD_colorizeMin", colorizeMin);
mod.addUniformFrag("f", "MOD_colorizeMax", colorizeMax);

updateDefines();

function updateDefines()
{
    mod.toggleDefine("MOD_HEIGHTMAP_COLORIZE", colorize.get());

    mod.toggleDefine("MOD_HEIGHTMAP_INVERT", range.get() == "1-0");
    mod.toggleDefine("MOD_HEIGHTMAP_NORMALIZE", range.get() == "Normalized");

    mod.toggleDefine("MOD_DISPLACE_REMOVE_ZERO", removeZero.get());

    mod.toggleDefine("MOD_INPUT_R", channel.get() == "R");
    mod.toggleDefine("MOD_INPUT_G", channel.get() == "G");
    mod.toggleDefine("MOD_INPUT_B", channel.get() == "B");
    mod.toggleDefine("MOD_INPUT_A", channel.get() == "A");
    mod.toggleDefine("MOD_INPUT_RGB", channel.get() == "RGB");
    mod.toggleDefine("MOD_INPUT_LUMI", channel.get() == "Luminance");

    mod.toggleDefine("MOD_FLIP_X", flip.get() == "X");
    mod.toggleDefine("MOD_FLIP_Y", flip.get() == "Y");
    mod.toggleDefine("MOD_FLIP_XY", flip.get() == "XY");

    mod.toggleDefine("MOD_AXIS_X", axis.get() == "X");
    mod.toggleDefine("MOD_AXIS_Y", axis.get() == "Y");
    mod.toggleDefine("MOD_AXIS_Z", axis.get() == "Z");
    mod.toggleDefine("MOD_AXIS_XYZ", axis.get() == "XYZ");
    mod.toggleDefine("MOD_AXIS_XY", axis.get() == "XY");

    mod.toggleDefine("MOD_MODE_BITANGENT", meth.get() == "BiTang");
    mod.toggleDefine("MOD_MODE_TANGENT", meth.get() == "Tang");
    mod.toggleDefine("MOD_MODE_NORMAL", meth.get() == "Norm");
    mod.toggleDefine("MOD_MODE_VERTCOL", meth.get() == "VertCol");
    mod.toggleDefine("MOD_MODE_MUL", meth.get() == "*");
    mod.toggleDefine("MOD_MODE_ADD", meth.get() == "+");
    mod.toggleDefine("MOD_MODE_DIV", meth.get() == "/");
    mod.toggleDefine("MOD_SMOOTHSTEP", 0);

    mod.toggleDefine("MOD_COORD_TC", src.get() == "Tex Coords");
    mod.toggleDefine("MOD_COORD_MESHXY", src.get() == "Mesh XY");
    mod.toggleDefine("MOD_COORD_MESHXZ", src.get() == "Mesh XZ");

    mod.toggleDefine("MOD_CALC_NORMALS", calcNormals.get());
    mod.toggleDefine("MOD_NORMALS_X", calcNormalsAxis.get() == "X");
    mod.toggleDefine("MOD_NORMALS_Y", calcNormalsAxis.get() == "Y");
    mod.toggleDefine("MOD_NORMALS_Z", calcNormalsAxis.get() == "Z");

    calcNormalsAxis.setUiAttribs({ "greyout": !calcNormals.get() });
}

function dorender()
{
    mod.bind();

    if (texture.get() && !texture.get().deleted) mod.pushTexture("MOD_texture", texture.get());
    else mod.pushTexture("MOD_texture", CGL.Texture.getEmptyTexture(cgl));

    next.trigger();

    mod.unbind();
}


};

Ops.Gl.ShaderEffects.VertexDisplacementMap_v4.prototype = new CABLES.Op();
CABLES.OPS["ed36e5ad-457b-4ac6-a929-11b66951cb6c"]={f:Ops.Gl.ShaderEffects.VertexDisplacementMap_v4,objName:"Ops.Gl.ShaderEffects.VertexDisplacementMap_v4"};




// **************************************************************
// 
// Ops.Gl.Meshes.LinesArray
// 
// **************************************************************

Ops.Gl.Meshes.LinesArray = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments=op.attachments={};
const
    render = op.inTrigger("render"),
    width = op.inValueFloat("width", 10),
    height = op.inValueFloat("height", 1),
    doLog = op.inValueBool("Logarithmic", false),
    pivotX = op.inValueSelect("pivot x", ["center", "left", "right"], "center"),
    pivotY = op.inValueSelect("pivot y", ["center", "top", "bottom"], "center"),
    nColumns = op.inValueInt("num columns", 10),
    nRows = op.inValueInt("num rows", 10),
    axis = op.inValueSelect("axis", ["xy", "xz"], "xy"),
    trigger = op.outTrigger("trigger"),
    outPointArrays = op.outArray("Point Arrays");

const cgl = op.patch.cgl;
let meshes = [];

op.setPortGroup("Size", [width, height]);
op.setPortGroup("Alignment", [pivotX, pivotY]);

axis.onChange =
    pivotX.onChange =
    pivotY.onChange =
    width.onChange =
    height.onChange =
    nRows.onChange =
    nColumns.onChange =
    doLog.onChange = rebuildDelayed;

rebuild();

render.onTriggered = function ()
{
    for (let i = 0; i < meshes.length; i++) meshes[i].render(cgl.getShader());
    trigger.trigger();
};

let delayRebuild = 0;
function rebuildDelayed()
{
    clearTimeout(delayRebuild);
    delayRebuild = setTimeout(rebuild, 60);
}

function rebuild()
{
    let x = 0;
    let y = 0;

    if (pivotX.get() == "center") x = 0;
    if (pivotX.get() == "right") x = -width.get() / 2;
    if (pivotX.get() == "left") x = +width.get() / 2;

    if (pivotY.get() == "center") y = 0;
    if (pivotY.get() == "top") y = -height.get() / 2;
    if (pivotY.get() == "bottom") y = +height.get() / 2;

    let numRows = parseInt(nRows.get(), 10);
    let numColumns = parseInt(nColumns.get(), 10);

    let stepColumn = width.get() / numColumns;
    let stepRow = height.get() / numRows;

    let c, r;
    meshes.length = 0;

    let vx, vy, vz;
    let verts = [];
    let tc = [];
    let indices = [];
    let count = 0;

    function addMesh()
    {
        let geom = new CGL.Geometry(op.name);
        geom.vertices = verts;
        geom.texCoords = tc;
        geom.verticesIndices = indices;

        let mesh = new CGL.Mesh(cgl, geom, { "glPrimitive": cgl.gl.LINES });
        mesh.setGeom(geom);
        meshes.push(mesh);

        verts.length = 0;
        tc.length = 0;
        indices.length = 0;
        count = 0;
        lvx = null;
    }

    let min = Math.log(1 / numRows);
    let max = Math.log(1);
    // op.log(min,max);

    let lines = [];

    for (r = numRows; r >= 0; r--)
    {
        // op.log(r/numRows);
        var lvx = null, lvy = null, lvz = null;
        let ltx = null, lty = null;
        let log = 0;
        let doLoga = doLog.get();

        let linePoints = [];
        lines.push(linePoints);


        for (c = numColumns; c >= 0; c--)
        {
            vx = c * stepColumn - width.get() / 2 + x;
            if (doLoga)
                vy = (Math.log((r / numRows)) / min) * height.get() - height.get() / 2 + y;
            else
                vy = r * stepRow - height.get() / 2 + y;

            let tx = c / numColumns;
            let ty = 1.0 - r / numRows;
            if (doLoga) ty = (Math.log((r / numRows)) / min);

            vz = 0.0;

            if (axis.get() == "xz")
            {
                vz = vy;
                vy = 0.0;
            }
            if (axis.get() == "xy") vz = 0.0;

            if (lvx !== null)
            {
                verts.push(lvx);
                verts.push(lvy);
                verts.push(lvz);

                linePoints.push(lvx, lvy, lvz);

                verts.push(vx);
                verts.push(vy);
                verts.push(vz);

                tc.push(ltx);
                tc.push(lty);

                tc.push(tx);
                tc.push(ty);

                indices.push(count);
                count++;
                indices.push(count);
                count++;
            }

            if (count > 64000)
            {
                addMesh();
            }

            ltx = tx;
            lty = ty;

            lvx = vx;
            lvy = vy;
            lvz = vz;
        }
    }

    outPointArrays.set(lines);

    addMesh();

    // op.log(meshes.length,' meshes');
}


};

Ops.Gl.Meshes.LinesArray.prototype = new CABLES.Op();
CABLES.OPS["a75265c2-957b-4719-9d03-7bbf00ace364"]={f:Ops.Gl.Meshes.LinesArray,objName:"Ops.Gl.Meshes.LinesArray"};




// **************************************************************
// 
// Ops.Gl.Shader.BasicMaterial_v3
// 
// **************************************************************

Ops.Gl.Shader.BasicMaterial_v3 = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments=op.attachments={"basicmaterial_frag":"{{MODULES_HEAD}}\n\nIN vec2 texCoord;\n\n#ifdef VERTEX_COLORS\nIN vec4 vertCol;\n#endif\n\n#ifdef HAS_TEXTURES\n    IN vec2 texCoordOrig;\n    #ifdef HAS_TEXTURE_DIFFUSE\n        UNI sampler2D tex;\n    #endif\n    #ifdef HAS_TEXTURE_OPACITY\n        UNI sampler2D texOpacity;\n   #endif\n#endif\n\n\n\nvoid main()\n{\n    {{MODULE_BEGIN_FRAG}}\n    vec4 col=color;\n\n\n    #ifdef HAS_TEXTURES\n        vec2 uv=texCoord;\n\n        #ifdef CROP_TEXCOORDS\n            if(uv.x<0.0 || uv.x>1.0 || uv.y<0.0 || uv.y>1.0) discard;\n        #endif\n\n        #ifdef HAS_TEXTURE_DIFFUSE\n            col=texture(tex,uv);\n\n            #ifdef COLORIZE_TEXTURE\n                col.r*=color.r;\n                col.g*=color.g;\n                col.b*=color.b;\n            #endif\n        #endif\n        col.a*=color.a;\n        #ifdef HAS_TEXTURE_OPACITY\n            #ifdef TRANSFORMALPHATEXCOORDS\n                uv=texCoordOrig;\n            #endif\n            #ifdef ALPHA_MASK_IR\n                col.a*=1.0-texture(texOpacity,uv).r;\n            #endif\n            #ifdef ALPHA_MASK_IALPHA\n                col.a*=1.0-texture(texOpacity,uv).a;\n            #endif\n            #ifdef ALPHA_MASK_ALPHA\n                col.a*=texture(texOpacity,uv).a;\n            #endif\n            #ifdef ALPHA_MASK_LUMI\n                col.a*=dot(vec3(0.2126,0.7152,0.0722), texture(texOpacity,uv).rgb);\n            #endif\n            #ifdef ALPHA_MASK_R\n                col.a*=texture(texOpacity,uv).r;\n            #endif\n            #ifdef ALPHA_MASK_G\n                col.a*=texture(texOpacity,uv).g;\n            #endif\n            #ifdef ALPHA_MASK_B\n                col.a*=texture(texOpacity,uv).b;\n            #endif\n            // #endif\n        #endif\n    #endif\n\n    {{MODULE_COLOR}}\n\n    #ifdef DISCARDTRANS\n        if(col.a<0.2) discard;\n    #endif\n\n    #ifdef VERTEX_COLORS\n        col*=vertCol;\n    #endif\n\n    outColor = col;\n}\n","basicmaterial_vert":"\n{{MODULES_HEAD}}\n\nOUT vec2 texCoord;\nOUT vec2 texCoordOrig;\n\nUNI mat4 projMatrix;\nUNI mat4 modelMatrix;\nUNI mat4 viewMatrix;\n\n#ifdef HAS_TEXTURES\n    UNI float diffuseRepeatX;\n    UNI float diffuseRepeatY;\n    UNI float texOffsetX;\n    UNI float texOffsetY;\n#endif\n\n#ifdef VERTEX_COLORS\n    in vec4 attrVertColor;\n    out vec4 vertCol;\n\n#endif\n\n\nvoid main()\n{\n    mat4 mMatrix=modelMatrix;\n    mat4 modelViewMatrix;\n\n    norm=attrVertNormal;\n    texCoordOrig=attrTexCoord;\n    texCoord=attrTexCoord;\n    #ifdef HAS_TEXTURES\n        texCoord.x=texCoord.x*diffuseRepeatX+texOffsetX;\n        texCoord.y=(1.0-texCoord.y)*diffuseRepeatY+texOffsetY;\n    #endif\n\n    #ifdef VERTEX_COLORS\n        vertCol=attrVertColor;\n    #endif\n\n    vec4 pos = vec4(vPosition, 1.0);\n\n    #ifdef BILLBOARD\n       vec3 position=vPosition;\n       modelViewMatrix=viewMatrix*modelMatrix;\n\n       gl_Position = projMatrix * mvMatrix * vec4((\n           position.x * vec3(\n               mvMatrix[0][0],\n               mvMatrix[1][0],\n               mvMatrix[2][0] ) +\n           position.y * vec3(\n               mvMatrix[0][1],\n               mvMatrix[1][1],\n               mvMatrix[2][1]) ), 1.0);\n    #endif\n\n    {{MODULE_VERTEX_POSITION}}\n\n    #ifndef BILLBOARD\n        modelViewMatrix=viewMatrix * mMatrix;\n\n        {{MODULE_VERTEX_MOVELVIEW}}\n\n    #endif\n\n    // mat4 modelViewMatrix=viewMatrix*mMatrix;\n\n    #ifndef BILLBOARD\n        // gl_Position = projMatrix * viewMatrix * modelMatrix * pos;\n        gl_Position = projMatrix * modelViewMatrix * pos;\n    #endif\n}\n",};
const render = op.inTrigger("render");
const trigger = op.outTrigger("trigger");
const shaderOut = op.outObject("shader", null, "shader");

shaderOut.ignoreValueSerialize = true;

op.toWorkPortsNeedToBeLinked(render);
op.toWorkShouldNotBeChild("Ops.Gl.TextureEffects.ImageCompose", CABLES.OP_PORT_TYPE_FUNCTION);

const cgl = op.patch.cgl;
const shader = new CGL.Shader(cgl, "basicmaterialnew", this);
shader.addAttribute({ "type": "vec3", "name": "vPosition" });
shader.addAttribute({ "type": "vec2", "name": "attrTexCoord" });
shader.addAttribute({ "type": "vec3", "name": "attrVertNormal", "nameFrag": "norm" });
shader.addAttribute({ "type": "float", "name": "attrVertIndex" });

shader.setModules(["MODULE_VERTEX_POSITION", "MODULE_COLOR", "MODULE_BEGIN_FRAG", "MODULE_VERTEX_MOVELVIEW"]);

shader.setSource(attachments.basicmaterial_vert, attachments.basicmaterial_frag);

shaderOut.setRef(shader);

render.onTriggered = doRender;

// rgba colors
const r = op.inValueSlider("r", Math.random());
const g = op.inValueSlider("g", Math.random());
const b = op.inValueSlider("b", Math.random());
const a = op.inValueSlider("a", 1);
r.setUiAttribs({ "colorPick": true });

// const uniColor=new CGL.Uniform(shader,'4f','color',r,g,b,a);
const colUni = shader.addUniformFrag("4f", "color", r, g, b, a);

shader.uniformColorDiffuse = colUni;

// diffuse outTexture

const diffuseTexture = op.inTexture("texture");
let diffuseTextureUniform = null;
diffuseTexture.onChange = updateDiffuseTexture;

const colorizeTexture = op.inValueBool("colorizeTexture", false);
const vertexColors = op.inValueBool("Vertex Colors", false);

// opacity texture
const textureOpacity = op.inTexture("textureOpacity");
let textureOpacityUniform = null;

const alphaMaskSource = op.inSwitch("Alpha Mask Source", ["Luminance", "R", "G", "B", "A", "1-A", "1-R"], "Luminance");
alphaMaskSource.setUiAttribs({ "greyout": true });
textureOpacity.onChange = updateOpacity;

const texCoordAlpha = op.inValueBool("Opacity TexCoords Transform", false);
const discardTransPxl = op.inValueBool("Discard Transparent Pixels");

// texture coords
const
    diffuseRepeatX = op.inValue("diffuseRepeatX", 1),
    diffuseRepeatY = op.inValue("diffuseRepeatY", 1),
    diffuseOffsetX = op.inValue("Tex Offset X", 0),
    diffuseOffsetY = op.inValue("Tex Offset Y", 0),
    cropRepeat = op.inBool("Crop TexCoords", false);

shader.addUniformFrag("f", "diffuseRepeatX", diffuseRepeatX);
shader.addUniformFrag("f", "diffuseRepeatY", diffuseRepeatY);
shader.addUniformFrag("f", "texOffsetX", diffuseOffsetX);
shader.addUniformFrag("f", "texOffsetY", diffuseOffsetY);

const doBillboard = op.inValueBool("billboard", false);

alphaMaskSource.onChange =
    doBillboard.onChange =
    discardTransPxl.onChange =
    texCoordAlpha.onChange =
    cropRepeat.onChange =
    vertexColors.onChange =
    colorizeTexture.onChange = updateDefines;

op.setPortGroup("Color", [r, g, b, a]);
op.setPortGroup("Color Texture", [diffuseTexture, vertexColors, colorizeTexture]);
op.setPortGroup("Opacity", [textureOpacity, alphaMaskSource, discardTransPxl, texCoordAlpha]);
op.setPortGroup("Texture Transform", [diffuseRepeatX, diffuseRepeatY, diffuseOffsetX, diffuseOffsetY, cropRepeat]);

updateOpacity();
updateDiffuseTexture();

op.preRender = function ()
{
    shader.bind();
    doRender();
};

function doRender()
{
    if (!shader) return;

    cgl.pushShader(shader);
    shader.popTextures();

    if (diffuseTextureUniform && diffuseTexture.get()) shader.pushTexture(diffuseTextureUniform, diffuseTexture.get());
    if (textureOpacityUniform && textureOpacity.get()) shader.pushTexture(textureOpacityUniform, textureOpacity.get());

    trigger.trigger();

    cgl.popShader();
}

function updateOpacity()
{
    if (textureOpacity.get())
    {
        if (textureOpacityUniform !== null) return;
        shader.removeUniform("texOpacity");
        shader.define("HAS_TEXTURE_OPACITY");
        if (!textureOpacityUniform)textureOpacityUniform = new CGL.Uniform(shader, "t", "texOpacity");
    }
    else
    {
        shader.removeUniform("texOpacity");
        shader.removeDefine("HAS_TEXTURE_OPACITY");
        textureOpacityUniform = null;
    }

    updateDefines();
}

function updateDiffuseTexture()
{
    if (diffuseTexture.get())
    {
        if (!shader.hasDefine("HAS_TEXTURE_DIFFUSE"))shader.define("HAS_TEXTURE_DIFFUSE");
        if (!diffuseTextureUniform)diffuseTextureUniform = new CGL.Uniform(shader, "t", "texDiffuse");
    }
    else
    {
        shader.removeUniform("texDiffuse");
        shader.removeDefine("HAS_TEXTURE_DIFFUSE");
        diffuseTextureUniform = null;
    }
    updateUi();
}

function updateUi()
{
    const hasTexture = diffuseTexture.isLinked() || textureOpacity.isLinked();
    diffuseRepeatX.setUiAttribs({ "greyout": !hasTexture });
    diffuseRepeatY.setUiAttribs({ "greyout": !hasTexture });
    diffuseOffsetX.setUiAttribs({ "greyout": !hasTexture });
    diffuseOffsetY.setUiAttribs({ "greyout": !hasTexture });
    colorizeTexture.setUiAttribs({ "greyout": !hasTexture });

    alphaMaskSource.setUiAttribs({ "greyout": !textureOpacity.get() });
    texCoordAlpha.setUiAttribs({ "greyout": !textureOpacity.get() });

    let notUsingColor = true;
    notUsingColor = diffuseTexture.get() && !colorizeTexture.get();
    r.setUiAttribs({ "greyout": notUsingColor });
    g.setUiAttribs({ "greyout": notUsingColor });
    b.setUiAttribs({ "greyout": notUsingColor });
}

function updateDefines()
{
    shader.toggleDefine("VERTEX_COLORS", vertexColors.get());
    shader.toggleDefine("CROP_TEXCOORDS", cropRepeat.get());
    shader.toggleDefine("COLORIZE_TEXTURE", colorizeTexture.get());
    shader.toggleDefine("TRANSFORMALPHATEXCOORDS", texCoordAlpha.get());
    shader.toggleDefine("DISCARDTRANS", discardTransPxl.get());
    shader.toggleDefine("BILLBOARD", doBillboard.get());

    shader.toggleDefine("ALPHA_MASK_ALPHA", alphaMaskSource.get() == "A");
    shader.toggleDefine("ALPHA_MASK_IALPHA", alphaMaskSource.get() == "1-A");
    shader.toggleDefine("ALPHA_MASK_IR", alphaMaskSource.get() == "1-R");
    shader.toggleDefine("ALPHA_MASK_LUMI", alphaMaskSource.get() == "Luminance");
    shader.toggleDefine("ALPHA_MASK_R", alphaMaskSource.get() == "R");
    shader.toggleDefine("ALPHA_MASK_G", alphaMaskSource.get() == "G");
    shader.toggleDefine("ALPHA_MASK_B", alphaMaskSource.get() == "B");
    updateUi();
}


};

Ops.Gl.Shader.BasicMaterial_v3.prototype = new CABLES.Op();
CABLES.OPS["ec55d252-3843-41b1-b731-0482dbd9e72b"]={f:Ops.Gl.Shader.BasicMaterial_v3,objName:"Ops.Gl.Shader.BasicMaterial_v3"};




// **************************************************************
// 
// Ops.Gl.ShaderEffects.FresnelGlow
// 
// **************************************************************

Ops.Gl.ShaderEffects.FresnelGlow = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments=op.attachments={"fresnel_body_frag":"#ifdef ENABLE_FRESNEL_MOD\n    vec3 MOD_fragNormal = normalize(MOD_norm);\n    col.rgb += MOD_inFresnel.rgb *\n        MOD_CalculateFresnel(vec3(MOD_cameraSpace_pos), MOD_fragNormal)\n        * MOD_inFresnel.w;\n#endif\n","fresnel_body_vert":"#ifdef ENABLE_FRESNEL_MOD\n    MOD_cameraSpace_pos = viewMatrix*mMatrix * pos;\n    MOD_norm = norm;\n    MOD_viewMatrix = mat3(viewMatrix);\n#endif","fresnel_head_frag":"IN vec4 MOD_cameraSpace_pos;\nIN mat3 MOD_viewMatrix;\nIN vec3 MOD_norm;\n\n#ifdef ENABLE_FRESNEL_MOD\n    float MOD_CalculateFresnel(vec3 cameraSpace_pos, vec3 normal)\n    {\n\n        vec3 nDirection = normalize(cameraSpace_pos);\n        vec3 nNormal = normalize(MOD_viewMatrix * normal);\n        vec3 halfDirection = normalize(nNormal + nDirection);\n\n        float cosine = dot(halfDirection, nDirection);\n        float product = max(cosine, 0.0);\n        float factor = pow(product, MOD_inFresnelExponent);\n\n        return 5. * factor;\n\n\n    }\n#endif\n","fresnel_head_vert":"#ifdef ENABLE_FRESNEL_MOD\n    OUT vec4 MOD_cameraSpace_pos;\n    OUT mat3 MOD_viewMatrix;\n    OUT vec3 MOD_norm;\n#endif",};
const cgl = op.patch.cgl;

const inTrigger = op.inTrigger("Trigger In");
const inActive = op.inBool("Active", true);
const inR = op.inFloatSlider("R", Math.random());
const inG = op.inFloatSlider("G", Math.random());
const inB = op.inFloatSlider("B", Math.random());
inR.setUiAttribs({ "colorPick": true });
op.setPortGroup("Color", [inR, inG, inB]);
const inIntensity = op.inFloat("Fresnel Intensity", 1);
const inExponent = op.inFloat("Fresnel Exponent", 2.5);
op.setPortGroup("Fresnel Settings", [inIntensity, inExponent]);

inActive.onChange = () =>
{
    mod.toggleDefine("ENABLE_FRESNEL_MOD", inActive);
    inR.setUiAttribs({ "greyout": !inActive.get() });
    inG.setUiAttribs({ "greyout": !inActive.get() });
    inB.setUiAttribs({ "greyout": !inActive.get() });
    inIntensity.setUiAttribs({ "greyout": !inActive.get() });
    inExponent.setUiAttribs({ "greyout": !inActive.get() });
};

const outTrigger = op.outTrigger("Trigger Out");


const mod = new CGL.ShaderModifier(cgl, "fresnelGlow");
mod.toggleDefine("ENABLE_FRESNEL_MOD", inActive);

mod.addModule({
    "priority": 2,
    "title": "fresnelGlow",
    "name": "MODULE_VERTEX_POSITION",
    "srcHeadVert": attachments.fresnel_head_vert,
    "srcBodyVert": attachments.fresnel_body_vert
});

mod.addModule({
    "title": "fresnelGlow",
    "name": "MODULE_COLOR",
    "srcHeadFrag": attachments.fresnel_head_frag,
    "srcBodyFrag": attachments.fresnel_body_frag
});

mod.addUniform("4f", "MOD_inFresnel", inR, inG, inB, inIntensity);
mod.addUniform("f", "MOD_inFresnelExponent", inExponent);

inTrigger.onTriggered = () =>
{
    mod.bind();
    outTrigger.trigger();
    mod.unbind();
};


};

Ops.Gl.ShaderEffects.FresnelGlow.prototype = new CABLES.Op();
CABLES.OPS["89979937-68a6-4736-8241-3c6b748103d4"]={f:Ops.Gl.ShaderEffects.FresnelGlow,objName:"Ops.Gl.ShaderEffects.FresnelGlow"};




// **************************************************************
// 
// Ops.Trigger.Sequence
// 
// **************************************************************

Ops.Trigger.Sequence = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments=op.attachments={};
const
    exe = op.inTrigger("exe"),
    cleanup = op.inTriggerButton("Clean up connections");

const
    exes = [],
    triggers = [],
    num = 16;

let
    updateTimeout = null,
    connectedOuts = [];

exe.onTriggered = triggerAll;
cleanup.onTriggered = clean;
cleanup.setUiAttribs({ "hideParam": true, "hidePort": true });

for (let i = 0; i < num; i++)
{
    const p = op.outTrigger("trigger " + i);
    triggers.push(p);
    p.onLinkChanged = updateButton;

    if (i < num - 1)
    {
        let newExe = op.inTrigger("exe " + i);
        newExe.onTriggered = triggerAll;
        exes.push(newExe);
    }
}

updateConnected();

function updateConnected()
{
    connectedOuts.length = 0;
    for (let i = 0; i < triggers.length; i++)
        if (triggers[i].links.length > 0) connectedOuts.push(triggers[i]);
}

function updateButton()
{
    updateConnected();
    clearTimeout(updateTimeout);
    updateTimeout = setTimeout(() =>
    {
        let show = false;
        for (let i = 0; i < triggers.length; i++)
            if (triggers[i].links.length > 1) show = true;

        cleanup.setUiAttribs({ "hideParam": !show });

        if (op.isCurrentUiOp()) op.refreshParams();
    }, 60);
}

function triggerAll()
{
    // for (let i = 0; i < triggers.length; i++) triggers[i].trigger();
    for (let i = 0; i < connectedOuts.length; i++) connectedOuts[i].trigger();
}

function clean()
{
    let count = 0;
    for (let i = 0; i < triggers.length; i++)
    {
        let removeLinks = [];

        if (triggers[i].links.length > 1)
            for (let j = 1; j < triggers[i].links.length; j++)
            {
                while (triggers[count].links.length > 0) count++;

                removeLinks.push(triggers[i].links[j]);
                const otherPort = triggers[i].links[j].getOtherPort(triggers[i]);
                op.patch.link(op, "trigger " + count, otherPort.op, otherPort.name);
                count++;
            }

        for (let j = 0; j < removeLinks.length; j++) removeLinks[j].remove();
    }
    updateButton();
    updateConnected();
}


};

Ops.Trigger.Sequence.prototype = new CABLES.Op();
CABLES.OPS["a466bc1f-06e9-4595-8849-bffb9fe22f99"]={f:Ops.Trigger.Sequence,objName:"Ops.Trigger.Sequence"};




// **************************************************************
// 
// Ops.Math.Math
// 
// **************************************************************

Ops.Math.Math = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments=op.attachments={};
const num0 = op.inFloat("number 0", 0),
    num1 = op.inFloat("number 1", 0),
    mathDropDown = op.inSwitch("math mode", ["+", "-", "*", "/", "%", "min", "max"], "+"),
    result = op.outNumber("result");

let mathFunc;

num0.onChange = num1.onChange = update;
mathDropDown.onChange = onFilterChange;

let n0 = 0;
let n1 = 0;

const mathFuncAdd = function (a, b) { return a + b; };
const mathFuncSub = function (a, b) { return a - b; };
const mathFuncMul = function (a, b) { return a * b; };
const mathFuncDiv = function (a, b) { return a / b; };
const mathFuncMod = function (a, b) { return a % b; };
const mathFuncMin = function (a, b) { return Math.min(a, b); };
const mathFuncMax = function (a, b) { return Math.max(a, b); };

function onFilterChange()
{
    let mathSelectValue = mathDropDown.get();

    if (mathSelectValue == "+") mathFunc = mathFuncAdd;
    else if (mathSelectValue == "-") mathFunc = mathFuncSub;
    else if (mathSelectValue == "*") mathFunc = mathFuncMul;
    else if (mathSelectValue == "/") mathFunc = mathFuncDiv;
    else if (mathSelectValue == "%") mathFunc = mathFuncMod;
    else if (mathSelectValue == "min") mathFunc = mathFuncMin;
    else if (mathSelectValue == "max") mathFunc = mathFuncMax;
    update();
    op.setUiAttrib({ "extendTitle": mathSelectValue });
}

function update()
{
    n0 = num0.get();
    n1 = num1.get();

    result.set(mathFunc(n0, n1));
}

onFilterChange();


};

Ops.Math.Math.prototype = new CABLES.Op();
CABLES.OPS["e9fdcaca-a007-4563-8a4d-e94e08506e0f"]={f:Ops.Math.Math,objName:"Ops.Math.Math"};




// **************************************************************
// 
// Ops.Devices.Keyboard.KeyPressLearn
// 
// **************************************************************

Ops.Devices.Keyboard.KeyPressLearn = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments=op.attachments={};
const learnedKeyCode = op.inValueInt("key code");
const canvasOnly = op.inValueBool("canvas only", true);
const modKey = op.inValueSelect("Mod Key", ["none", "alt"], "none");
const inEnable = op.inValueBool("Enabled", true);
const preventDefault = op.inValueBool("Prevent Default");
const learn = op.inTriggerButton("learn");
const onPress = op.outTrigger("on press");
const onRelease = op.outTrigger("on release");
const outPressed = op.outBoolNum("Pressed", false);
const outKey = op.outString("Key");

const cgl = op.patch.cgl;
let learning = false;

modKey.onChange = learnedKeyCode.onChange = updateKeyName;

function onKeyDown(e)
{
    if (learning)
    {
        learnedKeyCode.set(e.keyCode);
        if (CABLES.UI)
        {
            op.refreshParams();
        }
        // op.log("Learned key code: " + learnedKeyCode.get());
        learning = false;
        removeListeners();
        addListener();

        if (CABLES.UI)gui.emitEvent("portValueEdited", op, learnedKeyCode, learnedKeyCode.get());
    }
    else
    {
        if (e.keyCode == learnedKeyCode.get())
        {
            if (modKey.get() == "alt")
            {
                if (e.altKey === true)
                {
                    onPress.trigger();
                    outPressed.set(true);
                    if (preventDefault.get())e.preventDefault();
                }
            }
            else
            {
                onPress.trigger();
                outPressed.set(true);
                if (preventDefault.get())e.preventDefault();
            }
        }
    }
}

function onKeyUp(e)
{
    if (e.keyCode == learnedKeyCode.get())
    {
        let doTrigger = true;
        if (modKey.get() == "alt" && e.altKey != true) doTrigger = false;

        if (doTrigger)
        {
            onRelease.trigger();
            outPressed.set(false);
        }
    }
}

op.onDelete = function ()
{
    cgl.canvas.removeEventListener("keyup", onKeyUp, false);
    cgl.canvas.removeEventListener("keydown", onKeyDown, false);
    document.removeEventListener("keyup", onKeyUp, false);
    document.removeEventListener("keydown", onKeyDown, false);
};

learn.onTriggered = function ()
{
    // op.log("Listening for key...");
    learning = true;
    addDocumentListener();

    setTimeout(function ()
    {
        learning = false;
        removeListeners();
        addListener();
    }, 3000);
};

function addListener()
{
    if (canvasOnly.get()) addCanvasListener();
    else addDocumentListener();
}

function removeListeners()
{
    document.removeEventListener("keydown", onKeyDown, false);
    document.removeEventListener("keyup", onKeyUp, false);
    cgl.canvas.removeEventListener("keydown", onKeyDown, false);
    cgl.canvas.removeEventListener("keyup", onKeyUp, false);
    outPressed.set(false);
}

function addCanvasListener()
{
    if (!CABLES.UTILS.isNumeric(cgl.canvas.getAttribute("tabindex"))) cgl.canvas.setAttribute("tabindex", 1);

    cgl.canvas.addEventListener("keydown", onKeyDown, false);
    cgl.canvas.addEventListener("keyup", onKeyUp, false);
}

function addDocumentListener()
{
    document.addEventListener("keydown", onKeyDown, false);
    document.addEventListener("keyup", onKeyUp, false);
}

inEnable.onChange = function ()
{
    if (!inEnable.get())
    {
        removeListeners();
    }
    else
    {
        addListener();
    }
};

canvasOnly.onChange = function ()
{
    removeListeners();
    addListener();
};

function updateKeyName()
{
    let keyName = CABLES.keyCodeToName(learnedKeyCode.get());
    const modKeyName = modKey.get();
    if (modKeyName && modKeyName !== "none")
    {
        keyName = modKeyName.charAt(0).toUpperCase() + modKeyName.slice(1) + "-" + keyName;
    }
    op.setUiAttribs({ "extendTitle": keyName });
    outKey.set(keyName);
}

addCanvasListener();


};

Ops.Devices.Keyboard.KeyPressLearn.prototype = new CABLES.Op();
CABLES.OPS["f069c0db-4051-4eae-989e-6ef7953787fd"]={f:Ops.Devices.Keyboard.KeyPressLearn,objName:"Ops.Devices.Keyboard.KeyPressLearn"};




// **************************************************************
// 
// Ops.Trigger.Interval
// 
// **************************************************************

Ops.Trigger.Interval = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments=op.attachments={};
const
    interval = op.inValue("interval"),
    trigger = op.outTrigger("trigger"),
    active = op.inValueBool("Active", true);

active.onChange = function ()
{
    if (!active.get())
    {
        clearTimeout(timeOutId);
        timeOutId = -1;
    }
    else exec();
};

interval.set(1000);
let timeOutId = -1;

function exec()
{
    if (!active.get()) return;
    if (timeOutId != -1) return;

    timeOutId = setTimeout(function ()
    {
        timeOutId = -1;
        trigger.trigger();
        exec();
    },
    interval.get());
}

interval.onChange = exec;

exec();


};

Ops.Trigger.Interval.prototype = new CABLES.Op();
CABLES.OPS["3e9bae10-38af-4e36-9fcc-35faeeaf57f8"]={f:Ops.Trigger.Interval,objName:"Ops.Trigger.Interval"};




// **************************************************************
// 
// Ops.Trigger.TriggerCounterLoop
// 
// **************************************************************

Ops.Trigger.TriggerCounterLoop = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments=op.attachments={};
const exe = op.inTriggerButton("trigger in"),
    reset = op.inTriggerButton("reset"),
    trigger = op.outTrigger("trigger out"),
    num = op.outNumber("current count"),

    inMinLoopValue = op.inValueInt("Loop min", 0.0),
    inMaxLoopValue = op.inValueInt("Loop max", 4.0);

let n = Math.floor(inMinLoopValue.get());

// increments with each trigger and loops
// depending on min and max loop values
// can also work with negative numbers
// if min is greater than max then it decrements
// instead of incrementing
exe.onTriggered = function ()
{
    let inMin = Math.floor(inMinLoopValue.get());
    let inMax = Math.floor(inMaxLoopValue.get());

    if (inMin < inMax)
    {
        if (n < inMin)
        {
            n = inMinLoopValue.get();
        }
        else if (n >= inMax)
        {
            n = inMinLoopValue.get();
        }
        else
        {
            n++;
        }
    }
    else if (inMin > inMax)
    {
        if (n < inMax)
        {
            n = inMin;
        }
        else if (n > inMin)
        {
            inMin;
        }
        else if (n <= inMax)
        {
            n = inMin;
        }
        else
        {
            n--;
        }
    }
    num.set(n);
    op.setUiAttrib({ "extendTitle": n });
    trigger.trigger();
};

reset.onTriggered = function ()
{
    let inMin = Math.floor(inMinLoopValue.get());
    let inMax = Math.floor(inMaxLoopValue.get());

    if (inMin < inMax)
    {
        n = inMin;
    }
    else if (inMax < inMin)
    {
        n = inMin;
    }
    else
    {
        n = 0;
    }
    op.setUiAttrib({ "extendTitle": n });
    num.set(n);
};


};

Ops.Trigger.TriggerCounterLoop.prototype = new CABLES.Op();
CABLES.OPS["d3356c53-e278-433f-af0b-d8327cd99a2d"]={f:Ops.Trigger.TriggerCounterLoop,objName:"Ops.Trigger.TriggerCounterLoop"};




// **************************************************************
// 
// Ops.Math.Compare.CompareNumbers
// 
// **************************************************************

Ops.Math.Compare.CompareNumbers = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments=op.attachments={};
const
    numberIn_1 = op.inFloat("Value in", 0),
    logicSelectMode = op.inSwitch("Comparison mode", [">", "<", ">=", "<=", "==", "!=", "><", ">=<"], ">"),
    numberIn_2 = op.inFloat("Condition value", 1),
    numberIn_3 = op.inFloat("Max", 1),
    resultNumberOut = op.outNumber("Result");

let logicFunc;

logicSelectMode.onChange = onFilterChange;

numberIn_1.onChange = numberIn_2.onChange = numberIn_3.onChange = update;

onFilterChange();

function onFilterChange()
{
    let logicSelectValue = logicSelectMode.get();
    if (logicSelectValue === ">") logicFunc = function (a, b, c) { if (a > b) return 1; return 0; };
    else if (logicSelectValue === "<") logicFunc = function (a, b, c) { if (a < b) return 1; return 0; };
    else if (logicSelectValue === ">=") logicFunc = function (a, b, c) { if (a >= b) return 1; return 0; };
    else if (logicSelectValue === "<=") logicFunc = function (a, b, c) { if (a <= b) return 1; return 0; };
    else if (logicSelectValue === "==") logicFunc = function (a, b, c) { if (a === b) return 1; return 0; };
    else if (logicSelectValue === "!=") logicFunc = function (a, b, c) { if (a !== b) return 1; return 0; };
    else if (logicSelectValue === "><") logicFunc = function (a, b, c) { if (a > Math.min(b, c) && a < Math.max(b, c)) return 1; return 0; };
    else if (logicSelectValue === ">=<") logicFunc = function (a, b, c) { if (a >= Math.min(b, c) && a <= Math.max(b, c)) return 1; return 0; };

    if (logicSelectValue === "><" || logicSelectValue === ">=<")
    {
        numberIn_3.setUiAttribs({ "greyout": false });
        numberIn_2.setUiAttribs({ "title": "Min" });
    }
    else
    {
        numberIn_3.setUiAttribs({ "greyout": true });
        numberIn_2.setUiAttribs({ "title": "Condition value" });
    }
    update();
    op.setUiAttrib({ "extendTitle": logicSelectValue });
}

function update()
{
    let n1 = numberIn_1.get();
    let n2 = numberIn_2.get();
    let n3 = numberIn_3.get();

    let resultNumber = logicFunc(n1, n2, n3);

    resultNumberOut.set(resultNumber);
}


};

Ops.Math.Compare.CompareNumbers.prototype = new CABLES.Op();
CABLES.OPS["169137db-9853-4384-ac5b-d10a0bbda5c2"]={f:Ops.Math.Compare.CompareNumbers,objName:"Ops.Math.Compare.CompareNumbers"};




// **************************************************************
// 
// Ops.Deprecated.Number.NumberSwitchBoolean
// 
// **************************************************************

Ops.Deprecated.Number.NumberSwitchBoolean = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments=op.attachments={};
const
    inBool = op.inValueBool("Boolean"),
    valFalse = op.inValue("Value false", 0),
    valTrue = op.inValue("Value true", 1),
    outVal = op.outNumber("Result");

inBool.onChange =
    valTrue.onChange =
    valFalse.onChange = update;

op.setPortGroup("Output Values", [valTrue, valFalse]);

function update()
{
    if (inBool.get()) outVal.set(valTrue.get());
    else outVal.set(valFalse.get());
}


};

Ops.Deprecated.Number.NumberSwitchBoolean.prototype = new CABLES.Op();
CABLES.OPS["637c5fa8-840d-4535-96ab-3d27b458a8ba"]={f:Ops.Deprecated.Number.NumberSwitchBoolean,objName:"Ops.Deprecated.Number.NumberSwitchBoolean"};




// **************************************************************
// 
// Ops.Trigger.TriggerCounter
// 
// **************************************************************

Ops.Trigger.TriggerCounter = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments=op.attachments={};
const
    exe = op.inTriggerButton("exe"),
    reset = op.inTriggerButton("reset"),
    trigger = op.outTrigger("trigger"),
    num = op.outNumber("timesTriggered");

op.toWorkPortsNeedToBeLinked(exe);

op.setUiAttrib({ "extendTitle": 0 });
let n = 0;

reset.onTriggered =
op.onLoaded =
    doReset;

exe.onTriggered = function ()
{
    n++;
    num.set(n);
    op.setUiAttrib({ "extendTitle": n });
    trigger.trigger();
};

function doReset()
{
    n = 0;
    op.setUiAttrib({ "extendTitle": n });
    num.set(n);
}


};

Ops.Trigger.TriggerCounter.prototype = new CABLES.Op();
CABLES.OPS["e640619f-235c-4543-bbf8-b358e0283180"]={f:Ops.Trigger.TriggerCounter,objName:"Ops.Trigger.TriggerCounter"};




// **************************************************************
// 
// Ops.Boolean.TriggerOnChangeBoolean
// 
// **************************************************************

Ops.Boolean.TriggerOnChangeBoolean = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments=op.attachments={};
const
    inBool = op.inValueBool("Value"),
    outTrue = op.outTrigger("True"),
    outFalse = op.outTrigger("False");

inBool.onChange = function ()
{
    if (inBool.get()) outTrue.trigger();
    else outFalse.trigger();
};


};

Ops.Boolean.TriggerOnChangeBoolean.prototype = new CABLES.Op();
CABLES.OPS["dba19c07-e3c4-4971-a991-c9e6212ca1c8"]={f:Ops.Boolean.TriggerOnChangeBoolean,objName:"Ops.Boolean.TriggerOnChangeBoolean"};




// **************************************************************
// 
// Ops.Gl.Matrix.OrbitControls
// 
// **************************************************************

Ops.Gl.Matrix.OrbitControls = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments=op.attachments={};
const
    render = op.inTrigger("render"),
    minDist = op.inValueFloat("min distance"),
    maxDist = op.inValueFloat("max distance"),

    minRotY = op.inValue("min rot y", 0),
    maxRotY = op.inValue("max rot y", 0),

    initialRadius = op.inValue("initial radius", 0),
    initialAxis = op.inValueSlider("initial axis y"),
    initialX = op.inValueSlider("initial axis x"),

    mul = op.inValueFloat("mul"),
    smoothness = op.inValueSlider("Smoothness", 1.0),
    speedX = op.inValue("Speed X", 1),
    speedY = op.inValue("Speed Y", 1),

    active = op.inValueBool("Active", true),

    allowPanning = op.inValueBool("Allow Panning", true),
    allowZooming = op.inValueBool("Allow Zooming", true),
    allowRotation = op.inValueBool("Allow Rotation", true),
    restricted = op.inValueBool("restricted", true),

    trigger = op.outTrigger("trigger"),
    outRadius = op.outNumber("radius"),
    outXDeg = op.outNumber("Rot X"),
    outYDeg = op.outNumber("Rot Y"),

    inReset = op.inTriggerButton("Reset");

op.setPortGroup("Initial Values", [initialAxis, initialX, initialRadius]);
op.setPortGroup("Interaction", [mul, smoothness, speedX, speedY]);
op.setPortGroup("Boundaries", [minRotY, maxRotY, minDist, maxDist]);

mul.set(1);
minDist.set(0.01);
maxDist.set(99999);

inReset.onTriggered = reset;

let eye = vec3.create();
const vUp = vec3.create();
const vCenter = vec3.create();
const viewMatrix = mat4.create();
const tempViewMatrix = mat4.create();
const vOffset = vec3.create();
const finalEyeAbs = vec3.create();

initialAxis.set(0.5);

let mouseDown = false;
let radius = 5;
outRadius.set(radius);

let lastMouseX = 0, lastMouseY = 0;
let percX = 0, percY = 0;

vec3.set(vCenter, 0, 0, 0);
vec3.set(vUp, 0, 1, 0);

const tempEye = vec3.create();
const finalEye = vec3.create();
const tempCenter = vec3.create();
const finalCenter = vec3.create();

let px = 0;
let py = 0;

let divisor = 1;
let element = null;
updateSmoothness();

op.onDelete = unbind;

const halfCircle = Math.PI;
const fullCircle = Math.PI * 2;

function reset()
{
    let off = 0;

    if (px % fullCircle < -halfCircle)
    {
        off = -fullCircle;
        px %= -fullCircle;
    }
    else
    if (px % fullCircle > halfCircle)
    {
        off = fullCircle;
        px %= fullCircle;
    }
    else px %= fullCircle;

    py %= (Math.PI);

    vec3.set(vOffset, 0, 0, 0);
    vec3.set(vCenter, 0, 0, 0);
    vec3.set(vUp, 0, 1, 0);

    percX = (initialX.get() * Math.PI * 2 + off);
    percY = (initialAxis.get() - 0.5);

    radius = initialRadius.get();
    eye = circlePos(percY);
}

function updateSmoothness()
{
    divisor = smoothness.get() * 10 + 1.0;
}

smoothness.onChange = updateSmoothness;

let initializing = true;

function ip(val, goal)
{
    if (initializing) return goal;
    return val + (goal - val) / divisor;
}

let lastPy = 0;
const lastPx = 0;

render.onTriggered = function ()
{
    const cgl = op.patch.cg;

    if (!element)
    {
        setElement(cgl.canvas);
        bind();
    }

    cgl.pushViewMatrix();

    px = ip(px, percX);
    py = ip(py, percY);

    let degY = (py + 0.5) * 180;

    if (minRotY.get() !== 0 && degY < minRotY.get())
    {
        degY = minRotY.get();
        py = lastPy;
    }
    else if (maxRotY.get() !== 0 && degY > maxRotY.get())
    {
        degY = maxRotY.get();
        py = lastPy;
    }
    else
    {
        lastPy = py;
    }

    const degX = (px) * CGL.RAD2DEG;

    outYDeg.set(degY);
    outXDeg.set(degX);

    circlePosi(eye, py);

    vec3.add(tempEye, eye, vOffset);
    vec3.add(tempCenter, vCenter, vOffset);

    finalEye[0] = ip(finalEye[0], tempEye[0]);
    finalEye[1] = ip(finalEye[1], tempEye[1]);
    finalEye[2] = ip(finalEye[2], tempEye[2]);

    finalCenter[0] = ip(finalCenter[0], tempCenter[0]);
    finalCenter[1] = ip(finalCenter[1], tempCenter[1]);
    finalCenter[2] = ip(finalCenter[2], tempCenter[2]);

    const empty = vec3.create();

    mat4.lookAt(viewMatrix, finalEye, finalCenter, vUp);
    mat4.rotate(viewMatrix, viewMatrix, px, vUp);

    // finaly multiply current scene viewmatrix
    mat4.multiply(cgl.vMatrix, cgl.vMatrix, viewMatrix);

    trigger.trigger();
    cgl.popViewMatrix();
    initializing = false;
};

function circlePosi(vec, perc)
{
    const mmul = mul.get();
    if (radius < minDist.get() * mmul) radius = minDist.get() * mmul;
    if (radius > maxDist.get() * mmul) radius = maxDist.get() * mmul;

    outRadius.set(radius * mmul);

    let i = 0, degInRad = 0;

    degInRad = 360 * perc / 2 * CGL.DEG2RAD;
    vec3.set(vec,
        Math.cos(degInRad) * radius * mmul,
        Math.sin(degInRad) * radius * mmul,
        0);
    return vec;
}

function circlePos(perc)
{
    const mmul = mul.get();
    if (radius < minDist.get() * mmul)radius = minDist.get() * mmul;
    if (radius > maxDist.get() * mmul)radius = maxDist.get() * mmul;

    outRadius.set(radius * mmul);

    let i = 0, degInRad = 0;
    const vec = vec3.create();
    degInRad = 360 * perc / 2 * CGL.DEG2RAD;
    vec3.set(vec,
        Math.cos(degInRad) * radius * mmul,
        Math.sin(degInRad) * radius * mmul,
        0);
    return vec;
}

function onmousemove(event)
{
    if (!mouseDown) return;

    const x = event.clientX;
    const y = event.clientY;

    let movementX = (x - lastMouseX);
    let movementY = (y - lastMouseY);

    movementX *= speedX.get();
    movementY *= speedY.get();

    if (event.buttons == 2 && allowPanning.get())
    {
        vOffset[2] += movementX * 0.01 * mul.get();
        vOffset[1] += movementY * 0.01 * mul.get();
    }
    else
    if (event.buttons == 4 && allowZooming.get())
    {
        radius += movementY * 0.05;
        eye = circlePos(percY);
    }
    else
    {
        if (allowRotation.get())
        {
            percX += movementX * 0.003;
            percY += movementY * 0.002;

            if (restricted.get())
            {
                if (percY > 0.5)percY = 0.5;
                if (percY < -0.5)percY = -0.5;
            }
        }
    }

    lastMouseX = x;
    lastMouseY = y;
}

function onMouseDown(event)
{
    lastMouseX = event.clientX;
    lastMouseY = event.clientY;
    mouseDown = true;

    try { element.setPointerCapture(event.pointerId); }
    catch (e) {}
}

function onMouseUp(e)
{
    mouseDown = false;
    // cgl.canvas.style.cursor='url(/ui/img/rotate.png),pointer';

    try { element.releasePointerCapture(e.pointerId); }
    catch (e) {}
}

function lockChange()
{
    const el = op.patch.cg.canvas;

    if (document.pointerLockElement === el || document.mozPointerLockElement === el || document.webkitPointerLockElement === el)
    {
        document.addEventListener("mousemove", onmousemove, false);
    }
}

function onMouseEnter(e)
{
    // cgl.canvas.style.cursor='url(/ui/img/rotate.png),pointer';
}

initialRadius.onChange = function ()
{
    radius = initialRadius.get();
    reset();
};

initialX.onChange = function ()
{
    px = percX = (initialX.get() * Math.PI * 2);
};

initialAxis.onChange = function ()
{
    py = percY = (initialAxis.get() - 0.5);
    eye = circlePos(percY);
};

const onMouseWheel = function (event)
{
    if (allowZooming.get())
    {
        const delta = CGL.getWheelSpeed(event) * 0.06;
        radius += (parseFloat(delta)) * 1.2;

        eye = circlePos(percY);
    }
};

const ontouchstart = function (event)
{
    if (event.touches && event.touches.length > 0) onMouseDown(event.touches[0]);
};

const ontouchend = function (event)
{
    onMouseUp();
};

const ontouchmove = function (event)
{
    if (event.touches && event.touches.length > 0) onmousemove(event.touches[0]);
};

active.onChange = function ()
{
    if (active.get())bind();
    else unbind();
};

function setElement(ele)
{
    unbind();
    element = ele;
    bind();
}

function bind()
{
    if (!element) return;

    element.addEventListener("pointermove", onmousemove);
    element.addEventListener("pointerdown", onMouseDown);
    element.addEventListener("pointerup", onMouseUp);
    element.addEventListener("pointerleave", onMouseUp);
    element.addEventListener("pointerenter", onMouseEnter);
    element.addEventListener("contextmenu", function (e) { e.preventDefault(); });
    element.addEventListener("wheel", onMouseWheel, { "passive": true });
}

function unbind()
{
    if (!element) return;

    element.removeEventListener("pointermove", onmousemove);
    element.removeEventListener("pointerdown", onMouseDown);
    element.removeEventListener("pointerup", onMouseUp);
    element.removeEventListener("pointerleave", onMouseUp);
    element.removeEventListener("pointerenter", onMouseUp);
    element.removeEventListener("wheel", onMouseWheel);
}

eye = circlePos(0);

initialX.set(0.25);
initialRadius.set(0.05);


};

Ops.Gl.Matrix.OrbitControls.prototype = new CABLES.Op();
CABLES.OPS["eaf4f7ce-08a3-4d1b-b9f4-ebc0b7b1cde1"]={f:Ops.Gl.Matrix.OrbitControls,objName:"Ops.Gl.Matrix.OrbitControls"};




// **************************************************************
// 
// Ops.Array.ArrayLength
// 
// **************************************************************

Ops.Array.ArrayLength = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments=op.attachments={};
const
    array = op.inArray("array"),
    outLength = op.outNumber("length");

outLength.ignoreValueSerialize = true;

function update()
{
    let l = 0;
    if (array.get()) l = array.get().length;
    else l = -1;
    outLength.set(l);
}

array.onChange = update;


};

Ops.Array.ArrayLength.prototype = new CABLES.Op();
CABLES.OPS["ea508405-833d-411a-86b4-1a012c135c8a"]={f:Ops.Array.ArrayLength,objName:"Ops.Array.ArrayLength"};




// **************************************************************
// 
// Ops.Array.ArrayGetTexture
// 
// **************************************************************

Ops.Array.ArrayGetTexture = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments=op.attachments={};
const
    array = op.inArray("array"),
    index = op.inValueInt("index"),
    value = op.outTexture("value");

let last = null;

array.ignoreValueSerialize = true;
value.ignoreValueSerialize = true;

index.onChange = update;
array.onChange = update;

op.toWorkPortsNeedToBeLinked(array, value);

const emptyTex = CGL.Texture.getEmptyTexture(op.patch.cgl);

function update()
{
    if (index.get() < 0)
    {
        value.set(emptyTex);
        return;
    }

    let arr = array.get();
    if (!arr)
    {
        value.set(emptyTex);
        return;
    }

    let ind = index.get();
    if (ind >= arr.length)
    {
        value.set(emptyTex);
        return;
    }
    if (arr[ind])
    {
        value.set(emptyTex);
        value.set(arr[ind]);
        last = arr[ind];
    }
}


};

Ops.Array.ArrayGetTexture.prototype = new CABLES.Op();
CABLES.OPS["afea522b-ab72-4574-b721-5d37f5abaf77"]={f:Ops.Array.ArrayGetTexture,objName:"Ops.Array.ArrayGetTexture"};




// **************************************************************
// 
// Ops.Array.StringToArray_v2
// 
// **************************************************************

Ops.Array.StringToArray_v2 = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments=op.attachments={};
const text = op.inStringEditor("text", "1,2,3"),
    separator = op.inString("separator", ","),
    toNumber = op.inValueBool("Numbers", true),
    trim = op.inValueBool("Trim", true),
    splitNewLines = op.inBool("Split Lines", false),
    arr = op.outArray("array"),
    parsed = op.outTrigger("Parsed"),
    len = op.outNumber("length");

text.setUiAttribs({ "ignoreBigPort": true });

text.onChange = separator.onChange = toNumber.onChange = trim.onChange = parse;

splitNewLines.onChange = () =>
{
    separator.setUiAttribs({ "greyout": splitNewLines.get() });
    parse();
};

parse();

function parse()
{
    if (!text.get())
    {
        arr.set(null);
        arr.set([]);
        len.set(0);
        return;
    }

    let textInput = text.get();
    if (trim.get() && textInput)
    {
        textInput = textInput.replace(/^\s+|\s+$/g, "");
        textInput = textInput.trim();
    }

    let r;
    let sep = separator.get();
    if (separator.get() === "\\n") sep = "\n";
    if (splitNewLines.get()) r = textInput.split("\n");
    else r = textInput.split(sep);

    if (r[r.length - 1] === "") r.length -= 1;

    len.set(r.length);

    if (trim.get())
    {
        for (let i = 0; i < r.length; i++)
        {
            r[i] = r[i].replace(/^\s+|\s+$/g, "");
            r[i] = r[i].trim();
        }
    }

    op.setUiError("notnum", null);
    if (toNumber.get())
    {
        let hasStrings = false;
        for (let i = 0; i < r.length; i++)
        {
            r[i] = Number(r[i]);
            if (!CABLES.UTILS.isNumeric(r[i]))
            {
                hasStrings = true;
            }
        }
        if (hasStrings)
        {
            op.setUiError("notnum", "Parse Error / Not all values numerical!");
        }
    }

    arr.setRef(r);
    parsed.trigger();
}


};

Ops.Array.StringToArray_v2.prototype = new CABLES.Op();
CABLES.OPS["c974de41-4ce4-4432-b94d-724741109c71"]={f:Ops.Array.StringToArray_v2,objName:"Ops.Array.StringToArray_v2"};




// **************************************************************
// 
// Ops.Devices.Midi.MidiNote
// 
// **************************************************************

Ops.Devices.Midi.MidiNote = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments=op.attachments={};
/* UTIL */
const NOTE_OFF = 0x8;
const NOTE_ON = 0x9;
const NOTE_VALUES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

const MIDIChannels = Array.from(Array(16).keys()).map((i) => { return i + 1; });

function getMIDINote(dataByte1LSB)
{
    return dataByte1LSB <= 126
        ? `${NOTE_VALUES[dataByte1LSB % 12]}${Math.floor(dataByte1LSB / 12) - 2} - ${dataByte1LSB}`
        : "NO NOTE";
}

const noteValues = Array.from(Array(128).keys(), (key) => { return getMIDINote(key); });
const velocityArray = Array.from(Array(128).keys(), (key) => { return 0; });
/* IN */
const inEvent = op.inObject("MIDI Event In");
const midiChannelDropdown = op.inValueSelect("MIDI Channel", MIDIChannels, 1);
const noteDropdown = op.inValueSelect("Note", noteValues, "none");
const normalizeDropdown = op.inSwitch(
    "Normalize Velocity",
    ["none", "0 to 1", "-1 to 1"],
    "none",
);
const gateType = op.inBool("Toggle Gate", false);
const learn = op.inTriggerButton("learn");
const clear = op.inTriggerButton("clear");

op.setPortGroup("MIDI", [inEvent, midiChannelDropdown]);
op.setPortGroup("", [learn, clear]);
op.setPortGroup("Note", [noteDropdown, normalizeDropdown, gateType]);

/* OUT */
const eventOut = op.outObject("MIDI Event Out");
const triggerOut = op.outTrigger("Trigger Out");
const currentNoteOut = op.outNumber("Current Note");
const velocityOut = op.outNumber("Velocity");
const gateOut = op.outBoolNum("Gate");
const arrayOut = op.outArray("Velocity Array");
arrayOut.set(velocityArray);

op.setPortGroup("MIDI/Trigger Out", [eventOut, triggerOut]);
op.setPortGroup("Note Out", [currentNoteOut, velocityOut, gateOut]);
noteDropdown.set(0);
midiChannelDropdown.set(1);

let learning = false;
learn.onTriggered = () =>
{
    learning = true;
};

clear.onTriggered = () =>
{
    noteDropdown.set(0);
    midiChannelDropdown.set(1);
    normalizeDropdown.set(normalizeDropdown.get("none"));
    gateType.set(false);
    op.refreshParams();
};

gateType.onChange = () =>
{
    if (!gateType.get()) gateOut.set(false);
};

inEvent.onChange = () =>
{
    const event = inEvent.get();
    if (!event) return;
    if (event.messageType !== "Note") return;
    if (!event.newNote) return;

    const [statusByte] = event.data;

    const { newNote, velocity } = event;
    const [noteIndex, noteName] = newNote;

    if (learning || noteDropdown.onChange)
    {
        noteDropdown.set(noteName);
        midiChannelDropdown.set(event.channel + 1);

        learning = false;

        if (CABLES.UI)
        {
            gui.emitEvent("portValueEdited", op, noteDropdown, noteDropdown.get());
            gui.emitEvent("portValueEdited", op, midiChannelDropdown, midiChannelDropdown.get());

            op.uiAttr({ "info": `bound to Note: ${noteDropdown.get()}` });
            op.refreshParams();
        }
    }

    if (event.channel === midiChannelDropdown.get() - 1)
    {
        if (getMIDINote(noteIndex) === noteDropdown.get())
        {
            if ((statusByte >> 4 === NOTE_OFF || velocity === 0) && !gateType.get())
            {
                gateOut.set(false);
                velocityOut.set(0);
                velocityArray[noteIndex] = 0;
                arrayOut.set(null);
                arrayOut.set(velocityArray);
            }
            else if (statusByte >> 4 === NOTE_ON)
            {
                if (gateType.get())
                {
                    gateOut.set(!gateOut.get());
                }
                else
                {
                    gateOut.set(true);
                }
                currentNoteOut.set(noteIndex);
                velocityArray[noteIndex] = velocity;
                arrayOut.set(null);
                arrayOut.set(velocityArray);
                if (normalizeDropdown.get() === "0 to 1")
                {
                    // (max'-min')/(max-min)*(value-min)+min'
                    velocityOut.set((1 / 126) * (velocity - 1));
                    velocityArray[noteIndex] = (1 / 126) * (velocity - 1);
                    triggerOut.trigger();
                }
                else if (normalizeDropdown.get() === "-1 to 1")
                {
                    // (max'-min')/(max-min)*(value-min)+min'
                    const normalizedValue = (2 / 126) * (velocity - 1) - 1;
                    velocityArray[noteIndex] = normalizedValue;
                    velocityOut.set(normalizedValue);
                    triggerOut.trigger();
                }
                else if (normalizeDropdown.get() === "none")
                {
                    velocityOut.set(velocity);
                    triggerOut.trigger();
                }
            }
        }
        else if (noteDropdown.get() === 0)
        {
            // no note selected
            if ((statusByte >> 4 === NOTE_OFF || velocity === 0) && !gateType.get())
            {
                gateOut.set(false);
                velocityOut.set(0);
                velocityArray[noteIndex] = 0;
                arrayOut.set(null);
                arrayOut.set(velocityArray);
            }
            else if (statusByte >> 4 === NOTE_ON)
            {
                if (gateType.get())
                {
                    gateOut.set(!gateOut.get());
                }
                else
                {
                    gateOut.set(true);
                }
                currentNoteOut.set(noteIndex);

                if (normalizeDropdown.get() === "0 to 1")
                {
                    // (max'-min')/(max-min)*(value-min)+min'
                    const newVelocity = (1 / 126) * (velocity - 1);
                    velocityOut.set(newVelocity);
                    velocityArray[noteIndex] = newVelocity;
                    arrayOut.set(null);
                    arrayOut.set(velocityArray);
                    triggerOut.trigger();
                }
                else if (normalizeDropdown.get() === "-1 to 1")
                {
                    // (max'-min')/(max-min)*(value-min)+min'
                    const normalizedValue = (2 / 126) * (velocity - 1) - 1;
                    velocityOut.set(normalizedValue);
                    velocityArray[noteIndex] = normalizedValue;
                    arrayOut.set(null);
                    arrayOut.set(velocityArray);
                    triggerOut.trigger();
                }
                else if (normalizeDropdown.get() === "none")
                {
                    velocityOut.set(velocity);
                    velocityArray[noteIndex] = velocity;
                    arrayOut.set(null);
                    arrayOut.set(velocityArray);
                    triggerOut.trigger();
                }
            }
        }
    }
    eventOut.set(null);
    eventOut.set(event);
};


};

Ops.Devices.Midi.MidiNote.prototype = new CABLES.Op();
CABLES.OPS["517ed1fc-6110-4611-9cc7-8dd459191c65"]={f:Ops.Devices.Midi.MidiNote,objName:"Ops.Devices.Midi.MidiNote"};




// **************************************************************
// 
// Ops.Boolean.TriggerChangedFalse
// 
// **************************************************************

Ops.Boolean.TriggerChangedFalse = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments=op.attachments={};
let val = op.inValueBool("Value", false);
let next = op.outTrigger("Next");

let oldVal = 0;

val.onChange = function ()
{
    let newVal = val.get();
    if (oldVal && !newVal)
    {
        oldVal = false;
        next.trigger();
    }
    else
    {
        oldVal = true;
    }
};


};

Ops.Boolean.TriggerChangedFalse.prototype = new CABLES.Op();
CABLES.OPS["6387bcb0-6091-4199-8ab7-f96ad4aa3c7d"]={f:Ops.Boolean.TriggerChangedFalse,objName:"Ops.Boolean.TriggerChangedFalse"};




// **************************************************************
// 
// Ops.Gl.TextureArrayLoaderFromArray_v2
// 
// **************************************************************

Ops.Gl.TextureArrayLoaderFromArray_v2 = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments=op.attachments={};
const
    filenames = op.inArray("urls"),
    tfilter = op.inDropDown("filter", ["nearest", "linear", "mipmap"], "linear"),
    wrap = op.inDropDown("wrap", ["repeat", "mirrored repeat", "clamp to edge"], "repeat"),
    flip = op.inBool("Flip", false),
    unpackAlpha = op.inBool("unpackPreMultipliedAlpha", false),
    inCaching = op.inBool("Caching", false),
    inPatchAsset = op.inBool("Asset in patch", false),
    arrOut = op.outArray("TextureArray"),
    width = op.outNumber("width"),
    height = op.outNumber("height"),
    loading = op.outBoolNum("loading"),
    ratio = op.outNumber("Aspect Ratio");

op.toWorkPortsNeedToBeLinked(filenames);

const cgl = op.patch.cgl;
const arr = [];
let cgl_filter = CGL.Texture.FILTER_LINEAR;
let cgl_wrap = CGL.Texture.WRAP_MIRRORED_REPEAT;
let loadingId = null;
let timedLoader = 0;
arrOut.set(arr);

inPatchAsset.onChange =
    flip.onChange =
    unpackAlpha.onChange =
    filenames.onChange = reload;

tfilter.onChange = onFilterChange;
wrap.onChange = onWrapChange;

function reload(nocache)
{
    if (!filenames.isLinked())
    {
        arrOut.setRef(null);
        return;
    }
    clearTimeout(timedLoader);
    timedLoader = setTimeout(function ()
    {
        realReload(nocache);
    }, 30);
}

function loadImage(_i, _url, nocache, cb)
{
    let url = _url;
    const i = _i;
    if (!url) return;

    if (inPatchAsset.get())
    {
        let patchId = null;
        if (op.storage && op.storage.blueprint && op.storage.blueprint.patchId)
        {
            patchId = op.storage.blueprint.patchId;
        }
        url = op.patch.getAssetPath(patchId) + url;
    }

    url = op.patch.getFilePath(url);

    if (!inCaching.get()) if (nocache)url += "?rnd=" + CABLES.generateUUID();

    let tex = CGL.Texture.load(cgl, url,
        function (err)
        {
            if (err)
            {
                const errMsg = "could not load texture \"" + url + "\"";
                op.uiAttr({ "error": errMsg });
                op.warn("[TextureArrayLoader] " + errMsg);
                if (cb)cb();
                return;
            }
            else op.uiAttr({ "error": null });

            width.set(tex.width);
            height.set(tex.height);
            ratio.set(tex.width / tex.height);

            arr[i] = tex;

            arrOut.setRef(arr);
            if (cb)cb();
        }, {
            "wrap": cgl_wrap,
            "flip": flip.get(),
            "unpackAlpha": unpackAlpha.get(),
            "filter": cgl_filter
        });
}

function realReload(nocache)
{
    const files = filenames.get();

    if (!files || files.length == 0) return;

    if (loadingId)cgl.patch.loading.finished(loadingId);

    loadingId = cgl.patch.loading.start("texturearray", CABLES.uuid(), op);
    loading.set(true);

    for (let i = 0; i < files.length; i++)
    {
        arr[i] = CGL.Texture.getEmptyTexture(cgl);
        let cb = null;
        if (i == files.length - 1)
        {
            cb = () =>
            {
                loading.set(false);
                cgl.patch.loading.finished(loadingId);
            };
        }

        if (!files[i]) { if (cb) cb(); }
        else loadImage(i, files[i], nocache, cb);
    }
}

function onFilterChange()
{
    if (tfilter.get() == "nearest") cgl_filter = CGL.Texture.FILTER_NEAREST;
    if (tfilter.get() == "linear") cgl_filter = CGL.Texture.FILTER_LINEAR;
    if (tfilter.get() == "mipmap") cgl_filter = CGL.Texture.FILTER_MIPMAP;

    reload();
}

function onWrapChange()
{
    if (wrap.get() == "repeat") cgl_wrap = CGL.Texture.WRAP_REPEAT;
    if (wrap.get() == "mirrored repeat") cgl_wrap = CGL.Texture.WRAP_MIRRORED_REPEAT;
    if (wrap.get() == "clamp to edge") cgl_wrap = CGL.Texture.WRAP_CLAMP_TO_EDGE;

    reload();
}

op.onFileChanged = function (fn)
{
    // should reload changed files that are used in the array
};


};

Ops.Gl.TextureArrayLoaderFromArray_v2.prototype = new CABLES.Op();
CABLES.OPS["f994015c-72ab-42f4-9ef7-a6409a9efb9b"]={f:Ops.Gl.TextureArrayLoaderFromArray_v2,objName:"Ops.Gl.TextureArrayLoaderFromArray_v2"};




// **************************************************************
// 
// Ops.Devices.Midi.MidiInputDevice_v2
// 
// **************************************************************

Ops.Devices.Midi.MidiInputDevice_v2 = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments=op.attachments={};
// http://www.keithmcmillen.com/blog/making-music-in-the-browser-web-midi-api/

// https://ccrma.stanford.edu/~craig/articles/linuxmidi/misc/essenmidi.html

/* INPUTS */

const deviceSelect = op.inValueSelect("Device", ["none"]);

let learning = false;
const learn = op.inTriggerButton("Learn");
const resetIn = op.inTriggerButton("Panic");

op.setPortGroup("Device Select", [deviceSelect]);
op.setPortGroup("Controls", [learn, resetIn]);
/* OPS */
const opPrefix = "Ops.Devices.Midi.Midi";
const OPS = {
    "CC": { "NAMESPACE": `${opPrefix}CC`, "IN_PORT": "CC Index" },
    "NRPN": { "NAMESPACE": `${opPrefix}NRPN`, "IN_PORT": "NRPN Index" },
    "Note": { "NAMESPACE": `${opPrefix}Note`, "IN_PORT": "Note" },
};
/* OUTPUTS */
const OUTPUT_KEYS = [
    "Event",
    "Note",
    "CC",

    // "Channel Pressure",
    // "Poly Key Pressure",
    "NRPN",
    // 'SysEx',
    // "Pitchbend",
    "Program Change",
    "Clock",
];

// unused midi signals
const NOT_YET_USED = ["Pitchbend", "Channel Pressure", "Poly Key Pressure", "SysEx"];

// create outputs from keys specified above
const OUTPUTS = OUTPUT_KEYS.reduce((acc, cur) =>
{
    acc[cur] = op.outObject(cur);
    return acc;
}, {});

op.setPortGroup("MIDI Event", [OUTPUTS.Event]);
op.setPortGroup(
    "MIDI Event by Type",
    Object.keys(OUTPUTS).map((key) => { return key !== "Event" && OUTPUTS[key]; }).filter(Boolean),
);

/* CONSTANTS */
/* http://www.indiana.edu/~emusic/etext/MIDI/chapter3_MIDI3.shtml */
const NOTE_VALUES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

/* MIDI STATUS BYTES */
const NOTE_OFF = 0x8;
const NOTE_ON = 0x9;
const POLY_KEY_PRESSURE = 0xa;
const CC = 0xb;
const PROGRAM_CHANGE = 0xc;
const CHANNEL_PRESSURE = 0xd;
const PITCH_BEND = 0xe;
const CLOCK = 0xf8;
const CLOCK_START = 0xfa;
const CLOCK_CONTINUE = 0xfb;
const CLOCK_STOP = 0xfc;
const CLOCK_SIGNALS = [CLOCK, CLOCK_START, CLOCK_CONTINUE, CLOCK_STOP];

const MESSAGE_TYPES = {
    [NOTE_OFF]: "Note",
    [NOTE_ON]: "Note",
    [POLY_KEY_PRESSURE]: "Poly Key Pressure",
    [CC]: "CC",
    [PROGRAM_CHANGE]: "Program Change",
    [CHANNEL_PRESSURE]: "Channel Pressure",
    [PITCH_BEND]: "Pitchbend",
    [CLOCK]: "Clock",
};

/* UTILITY FUNCTIONS */
function getMIDIChannel(statusByte)
{
    return statusByte & 0x0f;
}

function getMessageType(statusByte)
{
    return MESSAGE_TYPES[statusByte >> 4] || "UNKNOWN";
}

function getMIDINote(dataByte1LSB)
{
    return dataByte1LSB <= 126
        ? `${NOTE_VALUES[dataByte1LSB % 12]}${Math.floor(dataByte1LSB / 12) - 2} - ${dataByte1LSB}`
        : "NO NOTE";
}

const NRPN_CCS = [98, 99, 6, 38];
const NRPN_VALUE_MSB = 6;
const NRPN_VALUE_LSB = 38;
const NRPN_INDEX_MSB = 99;
const NRPN_INDEX_LSB = 98;

let nrpnIndexMSB = null;
let nrpnIndexLSB = null;
let nrpnValueMSB = null;
let nrpnValueLSB = null;

let nrpnIndex_ = null;
let nrpnValue_ = null;

/* NRPN implementations differ, we need to check whether the cycle starts with LSB or MSB */
const MSB_START = 9;
const LSB_START = 10;
let FIRST_CC = null;
let ROUTINE_TYPE = null;
/* the state of the current NRPN construction cycle */

const LSBRoutine = (ccIndex, ccValue) =>
{
    // NOTE: this is still the MSBRoutine
    if (ccIndex === NRPN_INDEX_MSB) nrpnIndexMSB = ccValue << 7;
    else if (ccIndex === NRPN_INDEX_LSB) nrpnIndexLSB = ccValue;

    nrpnIndex_ = nrpnIndexMSB | nrpnIndexLSB;

    if (typeof nrpnIndex_ === "number")
    {
        if (ccIndex === NRPN_VALUE_MSB)
        {
            nrpnValueMSB = ccValue << 7;

            if (typeof nrpnValueLSB === "number")
            {
                nrpnValue_ = nrpnValueMSB | nrpnValueLSB;
                return [nrpnIndex_, nrpnValue_];
            }
        }
        else if (ccIndex === NRPN_VALUE_LSB)
        {
            nrpnValueLSB = ccValue;

            nrpnValue_ = nrpnValueMSB | nrpnValueLSB;
            return [nrpnIndex_, nrpnValue_];
        }
    }

    return null;
};

const MSBRoutine = (ccIndex, ccValue) =>
{
    if (ccIndex === NRPN_INDEX_MSB) nrpnIndexMSB = ccValue << 7;
    else if (ccIndex === NRPN_INDEX_LSB) nrpnIndexLSB = ccValue;

    nrpnIndex_ = nrpnIndexMSB | nrpnIndexLSB;
    if (typeof nrpnIndex_ === "number")
    {
        if (ccIndex === NRPN_VALUE_MSB)
        {
            nrpnValueMSB = ccValue << 7;

            if (typeof nrpnValueLSB === "number")
            {
                nrpnValue_ = nrpnValueMSB | nrpnValueLSB;
                return [nrpnIndex_, nrpnValue_];
            }
        }
        else if (ccIndex === NRPN_VALUE_LSB)
        {
            nrpnValueLSB = ccValue;
            nrpnValue_ = nrpnValueMSB | nrpnValueLSB;
            return [nrpnIndex_, nrpnValue_];
        }
    }

    return null;
};

const NRPNRoutine = (ccIndex, ccValue) =>
{
    if (FIRST_CC === null)
    {
        FIRST_CC = ccIndex;
        ROUTINE_TYPE = FIRST_CC === NRPN_INDEX_MSB ? MSB_START : LSB_START;
    }
    if (ROUTINE_TYPE === MSB_START)
    {
        return MSBRoutine(ccIndex, ccValue);
    }
    if (ROUTINE_TYPE === LSB_START)
    {
        return LSBRoutine(ccIndex, ccValue);
    }
    return null;
};
let midi = null;

/* INIT FUNCTIONS */
let outputDevice = null;

function onMIDIMessage(_event)
{
    if (!_event) return;

    if (op.patch.isEditorMode()) gui.emitEvent("userActivity");

    const { data } = _event;
    const [statusByte, LSB, MSB] = data;

    if (CLOCK_SIGNALS.includes(statusByte))
    {
        OUTPUTS.Clock.set(_event);
        return;
    }

    if (statusByte > 248)
    {
    // we don't use statusbytes above 248 for now
        return;
    }

    const deviceName = deviceSelect.get();
    const channel = getMIDIChannel(statusByte);

    let messageType = getMessageType(statusByte);
    const outputIndex = LSB;
    const outputValue = MSB;

    const isNRPNByte = messageType === "CC" && NRPN_CCS.some((cc) => { return cc === LSB; });
    let nrpnIndex;
    let nrpnValue;

    if (isNRPNByte)
    {
        const nrpnValueRes = NRPNRoutine(LSB, MSB);
        if (nrpnValueRes)
        {
            const [index, value] = nrpnValueRes;
            messageType = "NRPN";
            nrpnIndex = index;
            nrpnValue = value;
        }
    }

    const newEvent = {
        /* OLD EVENT v */
        deviceName,
        "inputId": 0, // what is this for?
        messageType,
        // ...,
        "index": outputIndex,
        "value": outputValue,

        "cmd": data[0] >> 4,
        "channel": data[0] & 0xf,
        "type": data[0] & 0xf0,
        "note": data[1],
        "velocity": data[2],
        data,
        ...messageType === "Note" && {
            "newNote": [LSB, getMIDINote(LSB)],
            "velocity": outputValue,
        },
        ...messageType === "NRPN" && { nrpnIndex, nrpnValue },
    };

    if (learning)
    {
        if (["Note", "CC", "NRPN"].includes(messageType))
        {
            const newOp = op.patch.addOp(OPS[messageType].NAMESPACE, {
                "translate": {
                    "x": op.uiAttribs.translate.x,
                    "y": op.uiAttribs.translate.y + 100,
                },
            });

            op.patch.link(op, messageType, newOp, "MIDI Event In");
            newOp.getPortByName("MIDI Channel").set(channel + 1);

            if (messageType === "Note")
            {
                const {
                    "newNote": [, noteName],
                } = newEvent;
                newOp.getPortByName("Note").set(noteName);
            }

            if (messageType === "CC")
            {
                const { index } = newEvent;
                newOp.getPortByName("CC Index").set(index);
            }

            if (messageType === "NRPN")
            {
                newOp.getPortByName("NRPN Index").set(nrpnIndex);
            }
        }
        learning = false;
    }
    // if (normalize.get()) event.velocity /= 127;

    // with pressure and tilt off
    // note off: 128, cmd: 8
    // note on: 144, cmd: 9
    // pressure / tilt on
    // pressure: 176, cmd 11:
    // bend: 224, cmd: 14
    OUTPUTS.Event.set(null);
    OUTPUTS.Event.set(newEvent);

    if (messageType !== "UNKNOWN" && !NOT_YET_USED.includes(messageType))
    {
        OUTPUTS[messageType].set(null);
        OUTPUTS[messageType].set(newEvent);
    }
}

function setDevice()
{
    if (!midi || !midi.inputs) return;
    const name = deviceSelect.get();

    op.setUiAttrib({ "extendTitle": name });

    const inputs = midi.inputs.values();
    //  const outputs = midi.outputs.values();

    for (let input = inputs.next(); input && !input.done; input = inputs.next())
    {
        if (input.value.name === name)
        {
            input.value.onmidimessage = onMIDIMessage;
            outputDevice = midi.inputs.get(input.value.id);
        }
        else if (input.value.onmidimessage === onMIDIMessage) input.value.onmidimessage = null;
    }
    op.setUiError("invalidswitch", null);
    /* for (let output = outputs.next(); output && !output.done; output = outputs.next()) {
    if (output.value.name === name) {
      outputDevice = midi.outputs.get(output.value.id);
    }
  } */
}

function onMIDIFailure()
{
    op.uiAttr({ "warning": "No MIDI support in your browser." });
}

function onMIDISuccess(midiAccess)
{
    midi = midiAccess;
    const inputs = midi.inputs.values();

    const deviceNames = [];

    for (let input = inputs.next(); input && !input.done; input = inputs.next())
    {
        deviceNames.push(input.value.name);
    }

    deviceSelect.uiAttribs.values = deviceNames;
    op.setUiError("invalidswitch", null);

    op.refreshParams();
    setDevice();
}

deviceSelect.onChange = setDevice;

if (navigator.requestMIDIAccess)
{
    navigator.requestMIDIAccess({ "sysex": false }).then(onMIDISuccess, onMIDIFailure);
}
else onMIDIFailure();

resetIn.onTriggered = () =>
{

    // TODO: senmd note off to every note
    /*
  if (!outputDevice) return;
  for (let i = 0; i < 12; i += 1) {
    outputDevice.send([0x90, i, 0]);
    outputDevice.send([0xb0, i, 0]);
  } */
};

learn.onTriggered = () =>
{
    if (!outputDevice) return;
    learning = true;
};


};

Ops.Devices.Midi.MidiInputDevice_v2.prototype = new CABLES.Op();
CABLES.OPS["484b3a00-41b7-4e3f-8a99-a1b32a764eff"]={f:Ops.Devices.Midi.MidiInputDevice_v2,objName:"Ops.Devices.Midi.MidiInputDevice_v2"};



window.addEventListener('load', function(event) {
CABLES.jsLoaded=new Event('CABLES.jsLoaded');
document.dispatchEvent(CABLES.jsLoaded);
});
