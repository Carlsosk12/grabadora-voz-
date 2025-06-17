class VoiceRecorder {
    constructor() {
        // ... (elementos DOM sin cambios) ...
        this.recordBtn = document.getElementById('recordBtn');
        this.stopBtn = document.getElementById('stopBtn');
        this.playBtn = document.getElementById('playBtn');
        this.downloadBtn = document.getElementById('downloadBtn');
        this.statusElement = document.getElementById('status');
        this.timerElement = document.getElementById('timer');
        this.audioPlayback = document.getElementById('audioPlayback');
        this.canvas = document.getElementById('visualizer');
        this.ctx = this.canvas.getContext('2d');

        // ... (variables de grabación sin cambios) ...
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.isRecording = false;
        this.recordingTime = 0;
        this.timerInterval = null;
        this.audioBlob = null;
        this.audioContext = null;
        this.analyser = null;
        this.dataArray = null;
        this.source = null;
        this.animationId = null;


        // AJUSTE CLAVE: Configuración dinámica del canvas
        this.setCanvasDimensions();

        // Inicializar eventos
        this.initEventListeners();
    }

    // NUEVA FUNCIÓN: Ajusta el canvas a su tamaño de CSS
    setCanvasDimensions() {
        this.canvas.width = this.canvas.offsetWidth;
        this.canvas.height = this.canvas.offsetHeight;
        // Volver a dibujar el estado inicial con las nuevas dimensiones
        this.drawIdleVisualization();
    }

    initEventListeners() {
        this.recordBtn.addEventListener('click', () => this.startRecording());
        this.stopBtn.addEventListener('click', () => this.stopRecording());
        this.playBtn.addEventListener('click', () => this.playRecording());
        this.downloadBtn.addEventListener('click', () => this.downloadRecording());

        // AJUSTE CLAVE: Redimensionar el canvas si la ventana cambia de tamaño
        window.addEventListener('resize', () => this.setCanvasDimensions());
    }

    async startRecording() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    sampleRate: 44100
                } 
            });

            // Asegurarse de que el canvas tenga las dimensiones correctas antes de visualizar
            this.setCanvasDimensions();
            // ... (el resto de la función startRecording sigue igual) ...
            this.mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
            this.audioChunks = [];
            this.mediaRecorder.ondataavailable = (event) => this.audioChunks.push(event.data);
            this.mediaRecorder.onstop = () => {
                this.audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
                const audioUrl = URL.createObjectURL(this.audioBlob);
                this.audioPlayback.src = audioUrl;
                this.audioPlayback.style.display = 'block';
                this.playBtn.disabled = false;
                this.downloadBtn.disabled = false;
            };
            this.setupVisualization(stream);
            this.mediaRecorder.start();
            this.isRecording = true;
            this.startTimer();
            this.updateUI();

        } catch (error) {
            console.error('Error al acceder al micrófono:', error);
            this.updateStatus('Error: No se puede acceder al micrófono');
        }
    }

    // ... (El resto de las funciones: setupVisualization, startVisualization, drawWaveform,
    // drawIdleVisualization, stopRecording, playRecording, downloadRecording, startTimer,
    // stopTimer, updateTimer, updateUI, updateStatus)
    // permanecen exactamente iguales a tu código original.
    // Solo las he omitido aquí para no hacer la respuesta excesivamente larga.
    // Debes mantener todo ese código tal cual lo tenías.
    
    // Aquí iría el resto de tu código JS sin cambios...
    setupVisualization(stream) {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.analyser = this.audioContext.createAnalyser();
        this.source = this.audioContext.createMediaStreamSource(stream);
        this.analyser.fftSize = 256;
        this.analyser.smoothingTimeConstant = 0.8;
        this.analyser.minDecibels = -90;
        this.analyser.maxDecibels = -10;
        const bufferLength = this.analyser.frequencyBinCount;
        this.dataArray = new Uint8Array(bufferLength);
        this.source.connect(this.analyser);
        this.startVisualization();
    }

    startVisualization() {
        const draw = () => {
            this.animationId = requestAnimationFrame(draw);
            if (!this.isRecording) {
                this.drawIdleVisualization();
                return;
            }
            this.analyser.getByteFrequencyData(this.dataArray);
            this.ctx.fillStyle = '#1a202c';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            const barWidth = (this.canvas.width / this.dataArray.length) * 2.5;
            let barHeight;
            let x = 0;
            const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
            gradient.addColorStop(0, '#ff6b6b');
            gradient.addColorStop(0.5, '#4ecdc4');
            gradient.addColorStop(1, '#667eea');
            for (let i = 0; i < this.dataArray.length; i++) {
                barHeight = (this.dataArray[i] / 255) * this.canvas.height * 0.8;
                this.ctx.fillStyle = gradient;
                this.ctx.fillRect(x, this.canvas.height - barHeight, barWidth, barHeight);
                this.ctx.globalAlpha = 0.3;
                this.ctx.fillRect(x, this.canvas.height, barWidth, -barHeight * 0.5);
                this.ctx.globalAlpha = 1;
                x += barWidth + 1;
            }
            this.drawWaveform();
        };
        draw();
    }

    drawWaveform() {
        const bufferLength = this.analyser.fftSize;
        const waveDataArray = new Uint8Array(bufferLength);
        this.analyser.getByteTimeDomainData(waveDataArray);
        this.ctx.lineWidth = 3;
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.globalAlpha = 0.8;
        this.ctx.beginPath();
        const sliceWidth = this.canvas.width / bufferLength;
        let x = 0;
        for (let i = 0; i < bufferLength; i++) {
            const v = waveDataArray[i] / 128.0;
            const y = (v * this.canvas.height) / 4 + this.canvas.height / 2;
            if (i === 0) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }
            x += sliceWidth;
        }
        this.ctx.stroke();
        this.ctx.globalAlpha = 1;
    }

    drawIdleVisualization() {
        this.ctx.fillStyle = '#1a202c';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.strokeStyle = '#4a5568';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(0, this.canvas.height / 2);
        this.ctx.lineTo(this.canvas.width, this.canvas.height / 2);
        this.ctx.stroke();
        this.ctx.fillStyle = '#718096';
        this.ctx.font = '20px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Presiona "Grabar" para comenzar', this.canvas.width / 2, this.canvas.height / 2 - 10);
    }

    stopRecording() {
        if (this.mediaRecorder && this.isRecording) {
            this.mediaRecorder.stop();
            this.isRecording = false;
            this.stopTimer();
            if (this.animationId) {
                cancelAnimationFrame(this.animationId);
                this.animationId = null;
            }
            setTimeout(() => {
                if (this.audioContext && this.audioContext.state !== 'closed') {
                    this.audioContext.close();
                }
            }, 100);
            this.updateUI();
            setTimeout(() => {
                this.drawIdleVisualization();
            }, 200);
        }
    }

    playRecording() {
        if (this.audioPlayback.src) {
            this.audioPlayback.play();
            this.updateStatus('Reproduciendo...');
            this.audioPlayback.onended = () => {
                this.updateStatus('Listo para grabar');
            };
        }
    }

    downloadRecording() {
        if (this.audioBlob) {
            const url = URL.createObjectURL(this.audioBlob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = `grabacion_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.webm`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }
    }

    startTimer() {
        this.recordingTime = 0;
        this.timerInterval = setInterval(() => {
            this.recordingTime++;
            this.updateTimer();
        }, 1000);
    }

    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
        }
    }

    updateTimer() {
        const minutes = Math.floor(this.recordingTime / 60);
        const seconds = this.recordingTime % 60;
        this.timerElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    updateUI() {
        if (this.isRecording) {
            this.recordBtn.disabled = true;
            this.recordBtn.classList.add('recording');
            this.stopBtn.disabled = false;
            this.playBtn.disabled = true;
            this.downloadBtn.disabled = true;
            this.updateStatus('Grabando...');
        } else {
            this.recordBtn.disabled = false;
            this.recordBtn.classList.remove('recording');
            this.stopBtn.disabled = true;
            this.updateStatus('Grabación completada');
        }
    }

    updateStatus(message) {
        this.statusElement.textContent = message;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        new VoiceRecorder();
    } else {
        document.getElementById('status').textContent = 'Tu navegador no soporta grabación de audio';
        document.getElementById('recordBtn').disabled = true;
    }
});