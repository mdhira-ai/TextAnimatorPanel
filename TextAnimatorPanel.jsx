/*
========================================================================
  TEXT ANIMATOR — ScriptUI Panel for Adobe After Effects
  Version 1.0

  WHAT THIS DOES
  A dockable panel that applies ready-made text animations (fade,
  typewriter, slide, bounce, elastic, blur, wiggle, flicker, rainbow,
  etc.) to any selected text layer(s), with duration / stagger / delay
  controls. Works on any project — nothing is hard-coded.

  HOW TO INSTALL
  1. Copy this file into:
     Windows: C:\Program Files\Adobe\Adobe After Effects <version>\Support Files\Scripts\ScriptUI Panels
     Mac:     /Applications/Adobe After Effects <version>/Scripts/ScriptUI Panels
  2. Restart After Effects.
  3. Open it from Window > TextAnimatorPanel.jsx (it will dock like any panel).

  You can also run it without installing:
     File > Scripts > Run Script File... > select this file.
     (It will open as a floating window instead of a dockable panel.)

  HOW TO USE
  1. Select one or more TEXT layers in your composition.
  2. Put the playhead where you want the animation to start
     (or uncheck "Start at Current Time" to start at each layer's In Point).
  3. Pick a preset from the dropdown, adjust Duration / Stagger / Delay /
     Distance as needed.
  4. Click "Apply Animation".
  5. To undo everything the panel did to a layer, select it and click
     "Remove Animation" (or just use Edit > Undo).
========================================================================
*/

(function (thisObj) {

    var SCRIPT_NAME = "Text Animator";

    // ---------------------------------------------------------------
    // Preset list + short descriptions shown in the UI
    // ---------------------------------------------------------------
    var PRESETS = [
        { name: "Fade In",                      desc: "Simple opacity fade from 0 to 100%." },
        { name: "Fade In (By Character)",       desc: "Characters fade + rise in one after another." },
        { name: "Typewriter",                   desc: "Characters snap on left-to-right, like typing." },
        { name: "Slide In - Left",              desc: "Layer slides in from the left, with fade." },
        { name: "Slide In - Right",             desc: "Layer slides in from the right, with fade." },
        { name: "Slide In - Top",               desc: "Layer slides in from above, with fade." },
        { name: "Slide In - Bottom",            desc: "Layer slides in from below, with fade." },
        { name: "Scale / Pop In",               desc: "Scales up from 0% to 100%, with fade." },
        { name: "Bounce In",                    desc: "Scales in and overshoots like a rubber bounce." },
        { name: "Rotate In",                    desc: "Rotates in from an angle while fading in." },
        { name: "Elastic Pop",                  desc: "Springy elastic scale-in with multiple wobbles." },
        { name: "Blur In",                      desc: "Starts blurred and sharpens into focus, with fade." },
        { name: "Skew In",                      desc: "Skews in from an angle back to normal, with fade." },
        { name: "Shake (Loop)",                 desc: "Continuous nervous position shake (expression)." },
        { name: "Wiggle Wave (Loop)",           desc: "Organic per-character floating motion (loop)." },
        { name: "Flicker (Loop)",               desc: "Random flickering opacity, like a bad light (loop)." },
        { name: "Rainbow Color Cycle (Loop)",   desc: "Per-character fill color continuously cycles hue." }
    ];

    // ===================================================================
    //  UI
    // ===================================================================
    function buildUI(thisObj) {
        var win = (thisObj instanceof Panel) ? thisObj : new Window("palette", SCRIPT_NAME, undefined, { resizeable: true });
        win.orientation = "column";
        win.alignChildren = ["fill", "top"];
        win.spacing = 8;
        win.margins = 12;

        win.add("statictext", undefined, "Select text layer(s) in your comp, choose a preset, then Apply.", { multiline: true });

        // --- Preset picker ---
        var presetPanel = win.add("panel", undefined, "Animation Preset");
        presetPanel.alignChildren = "fill";
        presetPanel.margins = 10;

        var names = [];
        for (var i = 0; i < PRESETS.length; i++) names.push(PRESETS[i].name);
        var presetList = presetPanel.add("dropdownlist", undefined, names);
        presetList.selection = 0;

        var descText = presetPanel.add("statictext", undefined, PRESETS[0].desc, { multiline: true });
        descText.graphics.font = ScriptUI.newFont(descText.graphics.font.name, "ITALIC", 11);

        presetList.onChange = function () {
            descText.text = PRESETS[presetList.selection.index].desc;
        };

        // --- Options ---
        var optsPanel = win.add("panel", undefined, "Options");
        optsPanel.orientation = "column";
        optsPanel.alignChildren = "left";
        optsPanel.margins = 10;
        optsPanel.spacing = 6;

        function makeField(parent, label, defaultVal) {
            var g = parent.add("group");
            g.alignment = "left";
            var st = g.add("statictext", undefined, label);
            st.preferredSize.width = 190;
            var et = g.add("edittext", undefined, defaultVal);
            et.characters = 8;
            return et;
        }

        var durInput        = makeField(optsPanel, "Duration (seconds):", "1.0");
        var staggerInput    = makeField(optsPanel, "Per-character stagger (sec):", "0.05");
        var layerDelayInput = makeField(optsPanel, "Delay between selected layers (sec):", "0.1");
        var distInput       = makeField(optsPanel, "Slide distance (px):", "150");

        var startAtPlayhead = optsPanel.add("checkbox", undefined, "Start at Current Time Indicator");
        startAtPlayhead.value = true;

        // --- Buttons ---
        var btnGroup = win.add("group");
        btnGroup.alignment = "fill";
        var applyBtn = btnGroup.add("button", undefined, "Apply Animation");
        var removeBtn = btnGroup.add("button", undefined, "Remove Animation");

        win.add("statictext", undefined,
            "Tip: select several text layers and use 'Delay between layers' to auto-stagger a whole animated title sequence. \n\nProgrammer: Md Habibor Rahman Hira \nProgrammer: Md Hasibur Rahman Panna  ",
            { multiline: true });

        // --- Actions ---
        applyBtn.onClick = function () {
            try {
                applyPreset(PRESETS[presetList.selection.index].name, getOpts());
            } catch (e) {
                alert("Text Animator error:\n" + e.toString());
            }
        };

        removeBtn.onClick = function () {
            try {
                removeAnimations();
            } catch (e) {
                alert("Text Animator error:\n" + e.toString());
            }
        };

        function getOpts() {
            return {
                duration:    parseFloat(durInput.text)        || 1.0,
                stagger:     parseFloat(staggerInput.text)    || 0.05,
                layerDelay:  parseFloat(layerDelayInput.text) || 0,
                distance:    parseFloat(distInput.text)       || 150,
                usePlayhead: startAtPlayhead.value
            };
        }

        win.layout.layout(true);
        win.layout.resize();
        win.onResizing = win.onResize = function () { this.layout.resize(); };

        return win;
    }

    // ===================================================================
    //  CORE APPLY / REMOVE LOGIC
    // ===================================================================
    function applyPreset(presetName, opts) {
        var comp = app.project.activeItem;
        if (!(comp && comp instanceof CompItem)) {
            alert("Please open and select a composition first.");
            return;
        }
        var sel = comp.selectedLayers;
        var textLayers = [];
        for (var i = 0; i < sel.length; i++) {
            if (sel[i] instanceof TextLayer) textLayers.push(sel[i]);
        }
        if (textLayers.length === 0) {
            alert("Please select at least one text layer.");
            return;
        }

        app.beginUndoGroup("Text Animator: " + presetName);
        try {
            for (var li = 0; li < textLayers.length; li++) {
                var layer = textLayers[li];
                var t0 = opts.usePlayhead ? comp.time : layer.inPoint;
                t0 += li * opts.layerDelay;
                var orig = captureOriginal(layer);
                try {
                    applyToLayer(layer, presetName, t0, opts, orig);
                } catch (innerErr) {
                    alert("Could not fully apply '" + presetName + "' to layer \"" + layer.name + "\":\n" + innerErr.toString());
                }
            }
        } finally {
            app.endUndoGroup();
        }
    }

    function captureOriginal(layer) {
        var tr = layer.transform;
        var orig = {};
        orig.opacity  = tr.opacity.value;
        orig.position = tr.position.value;
        orig.scale    = tr.scale.value;
        orig.rotation = tr.rotation.value;
        try { orig.skew = tr.property("Skew").value; } catch (e) { orig.skew = 0; }
        return orig;
    }

    function applyToLayer(layer, presetName, t0, opts, orig) {
        switch (presetName) {
            case "Fade In":                    fadeIn(layer, t0, opts.duration, orig); break;
            case "Fade In (By Character)":     fadeInByChar(layer, t0, opts, orig); break;
            case "Typewriter":                 typewriterReveal(layer, t0, opts, orig); break;
            case "Slide In - Left":            slideIn(layer, t0, opts, orig, "left"); break;
            case "Slide In - Right":           slideIn(layer, t0, opts, orig, "right"); break;
            case "Slide In - Top":             slideIn(layer, t0, opts, orig, "top"); break;
            case "Slide In - Bottom":          slideIn(layer, t0, opts, orig, "bottom"); break;
            case "Scale / Pop In":             scaleIn(layer, t0, opts, orig); break;
            case "Bounce In":                  bounceIn(layer, t0, opts, orig); break;
            case "Rotate In":                  rotateIn(layer, t0, opts, orig); break;
            case "Elastic Pop":                elasticPop(layer, t0, opts, orig); break;
            case "Blur In":                    blurIn(layer, t0, opts, orig); break;
            case "Skew In":                    skewIn(layer, t0, opts, orig); break;
            case "Shake (Loop)":               shakeLoop(layer, t0, opts, orig); break;
            case "Wiggle Wave (Loop)":         wiggleWaveLoop(layer, t0, opts, orig); break;
            case "Flicker (Loop)":             flickerLoop(layer, t0, opts, orig); break;
            case "Rainbow Color Cycle (Loop)": rainbowLoop(layer, t0, opts, orig); break;
            default:
                alert("Unknown preset: " + presetName);
        }
    }

    // ===================================================================
    //  KEYFRAME / EASE HELPERS
    // ===================================================================
    function setEasyEase(prop, keyIndex) {
        try {
            var dim = 1;
            try { dim = prop.value.length; } catch (e) { dim = 1; }
            var easeIn = [], easeOut = [];
            for (var d = 0; d < dim; d++) {
                easeIn.push(new KeyframeEase(0, 33));
                easeOut.push(new KeyframeEase(0, 33));
            }
            prop.setTemporalEaseAtKey(keyIndex, easeIn, easeOut);
        } catch (e) { /* non-fatal, skip ease */ }
    }

    function mulVec(arr, factor) {
        var r = [];
        for (var i = 0; i < arr.length; i++) r.push(arr[i] * factor);
        return r;
    }

    function fadeIn(layer, t0, duration, orig) {
        var op = layer.transform.opacity;
        op.setValueAtTime(t0, 0);
        op.setValueAtTime(t0 + duration, orig.opacity);
        setEasyEase(op, op.nearestKeyIndex(t0));
        setEasyEase(op, op.nearestKeyIndex(t0 + duration));
    }

    // ===================================================================
    //  WHOLE-LAYER TRANSFORM PRESETS
    // ===================================================================
    function slideIn(layer, t0, opts, orig, direction) {
        var pos = layer.transform.position;
        var startPos = orig.position.slice();
        switch (direction) {
            case "left":   startPos[0] -= opts.distance; break;
            case "right":  startPos[0] += opts.distance; break;
            case "top":    startPos[1] -= opts.distance; break;
            case "bottom": startPos[1] += opts.distance; break;
        }
        pos.setValueAtTime(t0, startPos);
        pos.setValueAtTime(t0 + opts.duration, orig.position);
        setEasyEase(pos, pos.nearestKeyIndex(t0));
        setEasyEase(pos, pos.nearestKeyIndex(t0 + opts.duration));
        fadeIn(layer, t0, opts.duration, orig);
    }

    function scaleIn(layer, t0, opts, orig) {
        var sc = layer.transform.scale;
        var zero = mulVec(orig.scale, 0);
        sc.setValueAtTime(t0, zero);
        sc.setValueAtTime(t0 + opts.duration, orig.scale);
        setEasyEase(sc, sc.nearestKeyIndex(t0));
        setEasyEase(sc, sc.nearestKeyIndex(t0 + opts.duration));
        fadeIn(layer, t0, opts.duration * 0.6, orig);
    }

    function bounceIn(layer, t0, opts, orig) {
        var sc = layer.transform.scale;
        var d = opts.duration;
        var s = orig.scale;
        var kfs = [
            [0,     mulVec(s, 0)],
            [0.55,  mulVec(s, 1.15)],
            [0.80,  mulVec(s, 0.95)],
            [1.0,   s]
        ];
        for (var i = 0; i < kfs.length; i++) {
            sc.setValueAtTime(t0 + kfs[i][0] * d, kfs[i][1]);
        }
        for (var k = 1; k <= kfs.length; k++) setEasyEase(sc, k);
        fadeIn(layer, t0, d * 0.3, orig);
    }

    function rotateIn(layer, t0, opts, orig) {
        var rot = layer.transform.rotation;
        rot.setValueAtTime(t0, orig.rotation - 30);
        rot.setValueAtTime(t0 + opts.duration, orig.rotation);
        setEasyEase(rot, rot.nearestKeyIndex(t0));
        setEasyEase(rot, rot.nearestKeyIndex(t0 + opts.duration));
        fadeIn(layer, t0, opts.duration * 0.6, orig);
    }

    function elasticPop(layer, t0, opts, orig) {
        var sc = layer.transform.scale;
        var d = opts.duration;
        var s = orig.scale;
        var pts = [
            [0,     0],
            [0.40,  1.25],
            [0.60,  0.90],
            [0.75,  1.08],
            [0.88,  0.97],
            [1.0,   1.0]
        ];
        for (var i = 0; i < pts.length; i++) {
            sc.setValueAtTime(t0 + pts[i][0] * d, mulVec(s, pts[i][1]));
        }
        for (var k = 1; k <= pts.length; k++) setEasyEase(sc, k);
        fadeIn(layer, t0, d * 0.3, orig);
    }

    function blurIn(layer, t0, opts, orig) {
        var fxParade = layer.property("ADBE Effect Parade");
        var blurEffect = null;
        try {
            blurEffect = fxParade.addProperty("ADBE Gaussian Blur 2");
        } catch (e1) {
            try { blurEffect = fxParade.addProperty("ADBE Gaussian Blur"); }
            catch (e2) {
                alert("Could not add a blur effect on \"" + layer.name + "\".");
                fadeIn(layer, t0, opts.duration, orig);
                return;
            }
        }
        blurEffect.name = "TA_BlurIn";
        var blurriness = null;
        try { blurriness = blurEffect.property("Blurriness"); } catch (e) {}
        if (!blurriness) { try { blurriness = blurEffect.property(1); } catch (e) {} }
        if (blurriness) {
            blurriness.setValueAtTime(t0, 60);
            blurriness.setValueAtTime(t0 + opts.duration, 0);
            setEasyEase(blurriness, blurriness.nearestKeyIndex(t0));
            setEasyEase(blurriness, blurriness.nearestKeyIndex(t0 + opts.duration));
        }
        fadeIn(layer, t0, opts.duration, orig);
    }

    function skewIn(layer, t0, opts, orig) {
        var skewProp = null;
        try { skewProp = layer.transform.property("Skew"); } catch (e) {}
        if (!skewProp) {
            alert("Skew property is not available on \"" + layer.name + "\". Applying fade only.");
            fadeIn(layer, t0, opts.duration, orig);
            return;
        }
        skewProp.setValueAtTime(t0, orig.skew + 40);
        skewProp.setValueAtTime(t0 + opts.duration, orig.skew);
        setEasyEase(skewProp, skewProp.nearestKeyIndex(t0));
        setEasyEase(skewProp, skewProp.nearestKeyIndex(t0 + opts.duration));
        fadeIn(layer, t0, opts.duration * 0.6, orig);
    }

    // ===================================================================
    //  PER-CHARACTER (TEXT ANIMATOR) PRESETS
    // ===================================================================
    function addTextAnimator(layer, label) {
        var textProp = layer.property("ADBE Text Properties");
        var animatorsGroup = textProp.property("ADBE Text Animators");
        var animator = animatorsGroup.addProperty("ADBE Text Animator");
        animator.name = "TA_" + label;
        var selectorsGroup = animator.property("ADBE Text Selectors");
        var rangeSelector = selectorsGroup.addProperty("ADBE Text Selector");
        var propsGroup = animator.property("ADBE Text Animator Properties");
        return { animator: animator, selectors: selectorsGroup, selector: rangeSelector, props: propsGroup };
    }

    function typewriterReveal(layer, t0, opts, orig) {
        var ta = addTextAnimator(layer, "Typewriter");
        var opacityProp = ta.props.addProperty("ADBE Text Opacity");
        opacityProp.setValue(0);

        var startProp = ta.selector.property("ADBE Text Percent Start");
        var endProp   = ta.selector.property("ADBE Text Percent End");
        endProp.setValue(100);
        startProp.setValueAtTime(t0, 0);
        startProp.setValueAtTime(t0 + opts.duration, 100);

        try {
            var adv = ta.selector.property("ADBE Text Range Advanced");
            adv.property("ADBE Text Selector Smoothness").setValue(0);
        } catch (e) { /* keep default if unavailable */ }
    }

    function fadeInByChar(layer, t0, opts, orig) {
        var ta = addTextAnimator(layer, "FadeByChar");
        var opacityProp = ta.props.addProperty("ADBE Text Opacity");
        opacityProp.setValue(0);
        var posProp = ta.props.addProperty("ADBE Text Position 3D");
        posProp.setValue([0, 25, 0]);

        var startProp = ta.selector.property("ADBE Text Percent Start");
        var endProp   = ta.selector.property("ADBE Text Percent End");
        endProp.setValue(100);
        startProp.setValueAtTime(t0, 0);
        startProp.setValueAtTime(t0 + opts.duration, 100);

        try {
            var adv = ta.selector.property("ADBE Text Range Advanced");
            adv.property("ADBE Text Selector Smoothness").setValue(100);
        } catch (e) { /* keep default if unavailable */ }
    }

    // ===================================================================
    //  LOOPING / EXPRESSION-DRIVEN PRESETS
    // ===================================================================
    function shakeLoop(layer, t0, opts, orig) {
        var pos = layer.transform.position;
        var amt = Math.max(2, Math.min(opts.distance * 0.15, 25));
        var expr =
            "var startT = " + t0.toFixed(3) + ";\n" +
            "if (time < startT) {\n" +
            "  value;\n" +
            "} else {\n" +
            "  wiggle(6, " + amt.toFixed(2) + ");\n" +
            "}";
        pos.expression = expr;
    }

    function flickerLoop(layer, t0, opts, orig) {
        var op = layer.transform.opacity;
        var baseOp = orig.opacity;
        var expr =
            "var startT = " + t0.toFixed(3) + ";\n" +
            "var baseOp = " + baseOp.toFixed(2) + ";\n" +
            "if (time < startT) {\n" +
            "  value;\n" +
            "} else {\n" +
            "  n = noise(time * 8);\n" +
            "  clamp(baseOp - n * 40, 0, 100);\n" +
            "}";
        op.expression = expr;
    }

    function wiggleWaveLoop(layer, t0, opts, orig) {
        var ta = addTextAnimator(layer, "WiggleWave");
        try { ta.selector.remove(); } catch (e) {}
        var wiggly = ta.selectors.addProperty("ADBE Text Wiggly Selector");
        var posProp = ta.props.addProperty("ADBE Text Position 3D");
        posProp.setValue([0, 20, 0]);
        try { wiggly.property("ADBE Text Wiggly Max Amount").setValue(100); } catch (e) {}
        try { wiggly.property("ADBE Text Wiggly Min Amount").setValue(-100); } catch (e) {}
        try { wiggly.property("ADBE Text Wiggly Freq").setValue(2); } catch (e) {}
    }

    function rainbowLoop(layer, t0, opts, orig) {
        var ta = addTextAnimator(layer, "Rainbow");
        var fillProp = null;
        try { fillProp = ta.props.addProperty("ADBE Text Fill Color"); } catch (e) {}
        if (!fillProp) {
            alert("Could not add a Fill Color animator property on \"" + layer.name + "\".");
            return;
        }
        var expr =
            "var startT = " + t0.toFixed(3) + ";\n" +
            "if (time < startT) {\n" +
            "  value;\n" +
            "} else {\n" +
            "  h = ((time - startT) * 0.3) % 1;\n" +
            "  s = 0.85; l = 0.55;\n" +
            "  function hue2rgb(p,q,t){ if(t<0) t+=1; if(t>1) t-=1; if(t<1/6) return p+(q-p)*6*t; if(t<1/2) return q; if(t<2/3) return p+(q-p)*(2/3-t)*6; return p; }\n" +
            "  q = l < 0.5 ? l*(1+s) : l+s-l*s;\n" +
            "  p = 2*l - q;\n" +
            "  r = hue2rgb(p,q,h+1/3); g = hue2rgb(p,q,h); b = hue2rgb(p,q,h-1/3);\n" +
            "  [r, g, b, 1];\n" +
            "}";
        fillProp.expression = expr;
    }

    // ===================================================================
    //  REMOVE ANIMATIONS
    // ===================================================================
    function clearProperty(prop, resetValue) {
        try { if (prop.expression && prop.expression !== "") prop.expression = ""; } catch (e) {}
        try {
            if (prop.numKeys > 0) {
                for (var k = prop.numKeys; k >= 1; k--) prop.removeKey(k);
            }
        } catch (e) {}
        try { prop.setValue(resetValue); } catch (e) {}
    }

    function removeAnimations() {
        var comp = app.project.activeItem;
        if (!(comp && comp instanceof CompItem)) {
            alert("Please select a composition first.");
            return;
        }
        var layers = comp.selectedLayers;
        var found = false;

        app.beginUndoGroup("Text Animator: Remove Animations");
        try {
            for (var i = 0; i < layers.length; i++) {
                var layer = layers[i];
                if (!(layer instanceof TextLayer)) continue;
                found = true;

                var tr = layer.transform;
                try { clearProperty(tr.opacity, 100); } catch (e) {}
                try { clearProperty(tr.position, tr.position.value); } catch (e) {}
                try { clearProperty(tr.scale, [100, 100]); } catch (e) {}
                try { clearProperty(tr.rotation, 0); } catch (e) {}
                try {
                    var sk = tr.property("Skew");
                    if (sk) clearProperty(sk, 0);
                } catch (e) {}

                // Remove effects this panel added
                try {
                    var fx = layer.property("ADBE Effect Parade");
                    for (var f = fx.numProperties; f >= 1; f--) {
                        var p = fx.property(f);
                        if (p.name.indexOf("TA_") === 0) p.remove();
                    }
                } catch (e) {}

                // Remove text animators this panel added
                try {
                    var animators = layer.property("ADBE Text Properties").property("ADBE Text Animators");
                    for (var a = animators.numProperties; a >= 1; a--) {
                        var an = animators.property(a);
                        if (an.name.indexOf("TA_") === 0) an.remove();
                    }
                } catch (e) {}
            }
        } finally {
            app.endUndoGroup();
        }

        if (!found) alert("No text layers were selected.");
    }

    // ===================================================================
    //  LAUNCH
    // ===================================================================
    var myPanel = buildUI(thisObj);
    if (myPanel instanceof Window) {
        myPanel.center();
        myPanel.show();
    } else {
        myPanel.layout.layout(true);
    }

})(this);
