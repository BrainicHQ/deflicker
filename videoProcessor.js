const {fetchFile} = FFmpegUtil;
const {FFmpeg} = FFmpegWASM;
let ffmpeg = null;
// Initialize FFmpeg right away


document.addEventListener('DOMContentLoaded', function () {
    const videoUploader = document.getElementById('videoUploader');
    const videoPlayer = document.getElementById('videoPlayer');
    const previewCanvas = document.getElementById('previewCanvas');
    const ctxPreview = previewCanvas.getContext('2d', {willReadFrequently: true});
    const brightnessControl = document.getElementById('brightness');
    const contrastControl = document.getElementById('contrast');
    const processButton = document.getElementById('processButton');
    const downloadButton = document.getElementById('downloadButton');

    let videoFile;

    videoUploader.addEventListener('change', handleFileUpload);
    videoPlayer.addEventListener('loadedmetadata', setupCanvas);
    videoPlayer.addEventListener('play', startPreview);
    videoPlayer.addEventListener('pause', stopPreview);
    processButton.addEventListener('click', processVideo);
    brightnessControl.addEventListener('input', updatePreview);
    contrastControl.addEventListener('input', updatePreview);


    async function loadFFmpeg() {
        if (ffmpeg === null) {
            ffmpeg = new FFmpeg();
            ffmpeg.on('log', ({message}) => {
                const logElement = document.getElementById('ffmpegLog');
                logElement.innerHTML = message; // Update log message in the UI
                console.log(message); // Also log it to the console
            });

            try {
                await ffmpeg.load({
                    coreURL: "/assets/core-mt/package/dist/umd/ffmpeg-core.js",
                });
                console.log('FFmpeg Core is loaded');
            } catch (e) {
                console.error('Error loading FFmpeg:', e);
                // Additional error handling or UI feedback can be added here
            }
        }
    }


    function handleFileUpload(event) {
        videoFile = event.target.files[0];
        if (videoFile) {
            const url = URL.createObjectURL(videoFile);
            videoPlayer.src = url;
            previewCanvas.style.display = 'block';
        }
    }

    function setupCanvas() {
        previewCanvas.width = videoPlayer.videoWidth;
        previewCanvas.height = videoPlayer.videoHeight;
    }

    function startPreview() {
        drawPreviewFrame();
    }

    function stopPreview() {
        cancelAnimationFrame(drawPreviewFrame);
    }

    function drawPreviewFrame() {
        if (!videoPlayer.paused && !videoPlayer.ended) {
            ctxPreview.drawImage(videoPlayer, 0, 0, previewCanvas.width, previewCanvas.height);
            let frameData = ctxPreview.getImageData(0, 0, previewCanvas.width, previewCanvas.height);
            adjustBrightnessContrast(frameData, parseFloat(brightnessControl.value), parseFloat(contrastControl.value));
            ctxPreview.putImageData(frameData, 0, 0);
            requestAnimationFrame(drawPreviewFrame);
        }
    }

    function adjustBrightnessContrast(imageData, brightness, contrast) {
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
            // Apply brightness
            data[i] *= brightness;     // Red
            data[i + 1] *= brightness; // Green
            data[i + 2] *= brightness; // Blue

            // Apply contrast
            data[i] = truncate(((data[i] - 128) * contrast) + 128);
            data[i + 1] = truncate(((data[i + 1] - 128) * contrast) + 128);
            data[i + 2] = truncate(((data[i + 2] - 128) * contrast) + 128);
        }
    }

    function truncate(value) {
        return Math.min(255, Math.max(0, value));
    }

    async function processVideo() {
        console.log("Processing video...");
        try {
            await loadFFmpeg();
            console.log("FFmpeg loaded.");

            // Write file to FFmpeg FS
            await ffmpeg.writeFile('input.mp4', await fetchFile(videoFile));
            console.log("File written to FFmpeg FS");

            // Simplified FFmpeg command for testing
            console.log("Executing FFmpeg command...");
            console.time('exec');
            await ffmpeg.exec(['-i', 'input.mp4', 'output.mp4']);
            console.timeEnd('exec');
            console.log("FFmpeg command executed");

            // Read the output file
            console.log("Reading output file...");
            const data = await ffmpeg.readFile('output.mp4');
            const url = URL.createObjectURL(new Blob([data.buffer], {type: 'video/mp4'}));
            downloadButton.href = url;
            downloadButton.download = 'processed-video.mp4';
            downloadButton.style.display = 'block';
            console.log("Process completed. Download button should be visible.");

        } catch (e) {
            console.error("Error during video processing:", e);
            // Additional error handling or UI feedback can be added here
        }
    }


    function updatePreview() {
        if (videoPlayer.paused || videoPlayer.ended) {
            drawPreviewFrame();
        }
    }
});