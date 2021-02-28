
/**
 * Pan / Zoom Support for : https://github.com/nhn/tui.image-editor
 * 
 * Desktop/Browser:
 * - Zoom on Mouse Whell
 * - Pan ou Middle button click
 * Mobile:
 * - Pinch zoom gestures
 * 
 * TODO:
 * - Pan on Mobile (TODO need a custom UI button)
 * 
 * Usage: new IEditorPanZoom(editor).enable();
 *
 * Based on snippets from : /issues/95#issuecomment-485933222
 * @author Ricardo JL Rufino
 */
function IEditorPanZoom(editor) {
    var scrollContainer;
    var editorContainer;
    var imageEditor = editor;
    
    // zoom
    let hypo = undefined;
    var pinchLast = 1;
    
    // pan
    var touchStart = {x:0,y:0};
    var panInitial = {top:0,left:0};
    
    // Speed Calc
    var scalc = {
        speed: 0,
        touchCurrent : {x:0,y:0}
    }

    var stime = 200;
    var refTouchX;

    var lastDrawingMode;
    
    //mouse mode
    var mousedown = false;
    var mouseMiddle = false;

    this.enable = function() {
        
        scrollContainer = $('.tui-image-editor-wrap');
        editorContainer = $('.tui-image-editor')[0];
        editorContainer.addEventListener('pointerdown', onPointerDown, false);
        editorContainer.addEventListener('touchmove', onTouchMove, false);
        editorContainer.addEventListener('touchend', onTouchEnd, false);
        editorContainer.addEventListener('mousewheel', onMousewheel, false);
        
        
        // not working on desktop (PAN)
        //editorContainer.addEventListener('onmousedown', onPointerDown, true);
        //editorContainer.addEventListener('onmousemove', onTouchMove, true);
        //editorContainer.addEventListener('onmouseup', onTouchEnd, true);
        
        // editorContainer.addEventListener('click', onPointerDown, true);
        
        editorContainer.click = onPointerDown;
        editorContainer.onmousemove = onTouchMove;
        editorContainer.onmouseup = onTouchEnd;
        
      
        // Prevent scroll with wheel
        $('.tui-image-editor-wrap')[0].onwheel = function() { return false; };
        // Prevent overlapping from toolbar
        $('.tui-image-editor-wrap').css('height', 'calc(100% - 150px)');
        
    };

    function onPointerDown(event) {
        
        console.log('onPointerDown:', event);
        
        touchStart = { x: event.clientX, y : event.clientY};
        scalc.touchCurrent = { x: event.clientX, y : event.clientY};
        mousedown = true;
        if(event.button == 1) mouseMiddle = true;
        
        // ignore on drawing...
        if(isPanDisabled(event)) return;
        
         // save and .setDrawingMode('NORMAL'), on shift pressed 
        if(event.shiftKey || mousedown){
            lastDrawingMode = imageEditor.getDrawingMode();
            console.log('disable selection...');
            imageEditor.startDrawingMode('NORMAL');
            imageEditor._graphics.canvasImage.canvas.selection = false;
        }
        
        // SpeedCalc Timer
        stracker = setInterval(function(){
            refTouchX = scalc.touchCurrent.x;
        }, stime);


        panInitial = {
            top: scrollContainer.scrollTop(),
            left: scrollContainer.scrollLeft(),
        };
        
        console.log('touchStart:', touchStart);
        console.log('panInitial:', panInitial);
    };

    function onTouchMove(event) {
        
        // console.log('onTouchMove');
        
        // Pinch / Zoom
        if(event.targetTouches){
            if (event.targetTouches.length === 2) {
                var touches = event.targetTouches;
                let hypo1 = Math.hypot((touches[0].pageX - touches[1].pageX), (touches[0].pageY - touches[1].pageY));
                if (hypo === undefined) {
                    hypo = hypo1;
                }
                var pinch = (hypo1 / hypo);
                var diff = pinch - pinchLast;

                // ignore very small movements
                if (Math.abs(diff) < 0.02) {
                    pinchLast = pinch;
                    return;
                }

                // console.log('diff:', diff);

                scaleCanvas((pinch > pinchLast), diff + 1, event);
                pinchLast = pinch;


            } // PAN
            else if (event.targetTouches.length === 1 && ! isPanDisabled(event)) {
                pan(event);
            }
            
        }else { // mouse
            
             if(!isPanDisabled(event)){
                pan(event);
            }
            
        }

        
    };

    function onTouchEnd(event) {
        console.log('onTouchEnd');

        hypo = undefined;
        pinchLast = 1;
        mousedown = false;
        mouseMiddle = false;
        
        // restore lastDrawingMode
        if(lastDrawingMode){
            imageEditor.startDrawingMode(lastDrawingMode);
            lastDrawingMode = null;
        }

        if(!isPanDisabled(event)){
            
            // Speed animation
            clearInterval(stracker);
            scalc.speed = Math.abs((refTouchX - scalc.touchCurrent.x) / stime);
            console.log('speed:', scalc.speed);
            if(scalc.speed >= 0.2){
                animateSpeed();
            };       
        }
    };
    
    
    function isPanDisabled(event){
        
        if(event && event.shiftKey) return false;
        
        if(mouseMiddle) return false; // middle
        
        if(!imageEditor.getDrawingMode) return false; // mock
        
        return imageEditor.getDrawingMode != 'NORMAL';
        
    }
    
    function pan(event){
        
        console.log('pan...');
        
        var clientX = event.clientX || event.targetTouches[0].clientX;
        var clientY = event.clientY || event.targetTouches[0].clientY;

        var moveX =  touchStart.x - clientX;
        var moveY =  touchStart.y - clientY;

        // console.log('pan..', moveX);
        scrollContainer.scrollLeft(panInitial.left + moveX);
        scrollContainer.scrollTop(panInitial.top + moveY);

        // Speed
        scalc.touchCurrent.x = clientX;
    }  
    
    /** start animatio using speed (not functional at this time) */
    function animateSpeed(){

        //start = null;
        //window.requestAnimationFrame(step);

        var moveX =  touchStart.x - scalc.touchCurrent.x;
        $(scrollContainer).animate({
            scrollLeft: scrollContainer.scrollLeft() + moveX
          }, 200);

    }
    
    /** zoom from pinch */
    function scaleCanvas(zoomIn, wDelta, e) {
        // console.log('scaleCanvas', wDelta);
        // console.log("touch: ", e.touches[0].clientY);
        var imageOriginalSize = {
            width: imageEditor._graphics.canvasImage.width
            , height: imageEditor._graphics.canvasImage.height
        };
        //      var imageEditorWindow = e.currentTarget;
        var imageEditorWindow = $('#tui-image-editor-container .tui-image-editor')[0];
        var initWidth = imageEditorWindow.style.width;
        var initHeight = imageEditorWindow.style.height;
        var scrollContainerInitial = {
            top: scrollContainer.scrollTop()
            , left: scrollContainer.scrollLeft()
            , height: scrollContainer[0].scrollHeight
            , width: scrollContainer[0].scrollWidth
        };
        // event.targetTouches[0].pageX - event.targetTouches[1].pageX
        var offset = $(imageEditorWindow).offset();
        var mousePosition = {
            top: e.targetTouches[0].clientY - offset.top
            , left: e.targetTouches[0].clientX - offset.left
        };
        var newWidth;
        var newHeight;
        var offsetY;
        var offsetX;
        
        if (zoomIn) {
            newWidth = parseInt(initWidth, 10) * wDelta;
            newHeight = parseInt(initHeight, 10) * wDelta;
            // Limit maximum zoom by image resolution
            if (newWidth > imageOriginalSize.width || newHeight > imageOriginalSize.height) {
                newWidth = imageOriginalSize.width;
                newHeight = imageOriginalSize.height;
            }
        }
        else {
            newWidth = parseInt(initWidth, 10) * wDelta;
            newHeight = parseInt(initHeight, 10) * wDelta;
            // Limit minimum zoom by 0.5 of original container size
            if (parseInt(imageEditorWindow.dataset.minWidth, 10) * 0.5 > parseInt(newWidth, 10)) {
                newWidth = parseInt(imageEditorWindow.dataset.minWidth, 10) * 0.5;
                newHeight = parseInt(imageEditorWindow.dataset.minHeight, 10) * 0.5;
            }
        }
        
        imageEditorWindow.style.width = newWidth + 'px';
        imageEditorWindow.style.height = newHeight + 'px';
        $(imageEditorWindow).find('canvas, .tui-image-editor-canvas-container')
            .css('max-width', imageEditorWindow.style.width)
            .css('max-height', imageEditorWindow.style.height);

        
        // Save initial size of container
        if (imageEditorWindow.dataset.minHeight === undefined) {
            imageEditorWindow.dataset.minHeight = initHeight;
            imageEditorWindow.dataset.minWidth = initWidth;
        }
        // Calculate scroll offset for new position
        offsetY = (scrollContainer[0].scrollHeight - scrollContainerInitial.height) * (mousePosition.top / scrollContainerInitial.height);
        offsetX = (scrollContainer[0].scrollWidth - scrollContainerInitial.width) * (mousePosition.left / scrollContainerInitial.width);
        scrollContainer.scrollTop(scrollContainerInitial.top + offsetY);
        scrollContainer.scrollLeft(scrollContainerInitial.left + offsetX);
        
        e.preventDefault();
        e.stopPropagation();
    };
    
    /** zoom using mouse scroll */
    function onMousewheel(e){
        var imageOriginalSize = {
            width: imageEditor._graphics.canvasImage.width,
            height: imageEditor._graphics.canvasImage.height
          };
          var wDelta = e.wheelDelta || e.originalEvent.deltaY;
          var imageEditorWindow = e.currentTarget;
          var scrollContainer = $('.tui-image-editor-wrap');
          var initWidth = imageEditorWindow.style.width;
          var initHeight = imageEditorWindow.style.height;
          var scrollContainerInitial = {
            top: scrollContainer.scrollTop(),
            left: scrollContainer.scrollLeft(),
            height: scrollContainer[0].scrollHeight,
            width: scrollContainer[0].scrollWidth
          };
          var mousePosition = {
            top: e.clientY - $(imageEditorWindow).offset().top,
            left: e.clientX - $(imageEditorWindow).offset().left
          };
          var newWidth;
          var newHeight;
          var offsetY;
          var offsetX;
          // Zoom step 10%
          if (wDelta > 0) {
            newWidth = parseInt(initWidth, 10) * 1.1;
            newHeight = parseInt(initHeight, 10) * 1.1;
            // Limit maximum zoom by image resolution
            if (newWidth > imageOriginalSize.width || newHeight > imageOriginalSize.height) {
              newWidth = imageOriginalSize.width;
              newHeight = imageOriginalSize.height;
            }
          } else {
            newWidth = parseInt(initWidth, 10) * 0.9;
            newHeight = parseInt(initHeight, 10) * 0.9;
            // Limit minimum zoom by 0.5 of original container size
            if (parseInt(imageEditorWindow.dataset.minWidth, 10) * 0.5 > parseInt(newWidth, 10)) {
              newWidth = parseInt(imageEditorWindow.dataset.minWidth, 10) * 0.5;
              newHeight = parseInt(imageEditorWindow.dataset.minHeight, 10) * 0.5;
            }
          }
          imageEditorWindow.style.width = newWidth + 'px';
          imageEditorWindow.style.height = newHeight + 'px';
          $(imageEditorWindow).find('canvas, .tui-image-editor-canvas-container')
            .css('max-width', imageEditorWindow.style.width)
            .css('max-height', imageEditorWindow.style.height);

          // Save initial size of container
          if (imageEditorWindow.dataset.minHeight === undefined) {
            imageEditorWindow.dataset.minHeight = initHeight;
            imageEditorWindow.dataset.minWidth = initWidth;
          }

           // Calculate scroll offset for new position
          offsetY = (scrollContainer[0].scrollHeight - scrollContainerInitial.height)
          * (mousePosition.top / scrollContainerInitial.height);
          offsetX = (scrollContainer[0].scrollWidth - scrollContainerInitial.width)
          * (mousePosition.left / scrollContainerInitial.width);

          scrollContainer.scrollTop(scrollContainerInitial.top + offsetY);
          scrollContainer.scrollLeft(scrollContainerInitial.left + offsetX);

          e.preventDefault();
          e.stopPropagation();
    }
}