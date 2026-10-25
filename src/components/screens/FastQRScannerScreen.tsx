import React, { useState, useEffect, useRef, useCallback } from 'react';
import jsQR from 'jsqr';
import {
  Camera,
  Play,
  Pause,
  RefreshCw,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Volume2,
  VolumeX,
  QrCode,
  User,
  Calendar,
  Clock,
  Sparkles,
  ChevronRight,
  Check
} from 'lucide-react';
import { School, Student, AttendanceRecord, AttendanceStatus, ClassGrade } from '../../types';
import { schoolService } from '../../services/schoolService';

interface FastQRScannerScreenProps {
  school: School | null;
  currentDate: string;
  onNavigateToAddStudent?: () => void;
  onNavigateToClasses?: () => void;
}

interface ScannedStudentCardData {
  student: Student;
  className: string;
  currentStatus: AttendanceStatus;
}

export const FastQRScannerScreen: React.FC<FastQRScannerScreenProps> = ({
  school,
  currentDate,
  onNavigateToAddStudent,
  onNavigateToClasses,
}) => {
  // Scanner state
  const [isScanning, setIsScanning] = useState(true);
  const [cameraActive, setCameraActive] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isRetrying, setIsRetrying] = useState(false);
  const [isInIframe, setIsInIframe] = useState(false);

  // Active Scanned Student Card & Four Actions
  const [activeScannedStudent, setActiveScannedStudent] = useState<ScannedStudentCardData | null>(null);
  const [savingStatus, setSavingStatus] = useState(false);
  const [savedConfirmation, setSavedConfirmation] = useState<string | null>(null);
  const [scannedWarning, setScannedWarning] = useState<string | null>(null);
  const [greenFlash, setGreenFlash] = useState(false);

  // Error state
  const [cameraError, setCameraError] = useState<{
    type: 'denied' | 'not_found' | 'not_readable' | 'insecure' | 'unsupported' | 'error';
    title: string;
    message: string;
    actionHint?: string;
  } | null>(null);

  // Attendance summary for today
  const [todayAttendanceCount, setTodayAttendanceCount] = useState(0);

  // Debouncing refs
  const lastScannedTokenRef = useRef<string>('');
  const lastScannedTimeRef = useRef<number>(0);
  const isProcessingScanRef = useRef<boolean>(false);
  const autoResetTimerRef = useRef<number | null>(null);

  // Video / Canvas DOM refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameIdRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Load today's count
  const loadTodayCount = useCallback(async () => {
    try {
      const allAttendance = await schoolService.getAttendanceForDate(currentDate);
      const presents = allAttendance.filter((r: AttendanceRecord) => r.status === 'present');
      setTodayAttendanceCount(presents.length);
    } catch {
      // fallback
    }
  }, [currentDate]);

  useEffect(() => {
    loadTodayCount();
  }, [loadTodayCount]);

  // Detect iframe
  useEffect(() => {
    try {
      setIsInIframe(window.self !== window.top);
    } catch {
      setIsInIframe(true);
    }
  }, []);

  // Web Audio chime feedback
  const playChime = useCallback(
    (type: 'scan' | 'success' | 'warn' | 'error') => {
      if (!soundEnabled) return;
      try {
        const AudioContextClass =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (!AudioContextClass) return;

        const ctx = new AudioContextClass();

        if (type === 'scan') {
          // Subtle soft high beep when QR is recognized
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(800, ctx.currentTime);
          gain.gain.setValueAtTime(0.12, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start();
          osc.stop(ctx.currentTime + 0.08);
        } else if (type === 'success') {
          // Cheerful two-tone ascending confirmation chime (520Hz -> 680Hz)
          const osc1 = ctx.createOscillator();
          const gain1 = ctx.createGain();
          osc1.type = 'sine';
          osc1.frequency.setValueAtTime(520, ctx.currentTime);
          gain1.gain.setValueAtTime(0.18, ctx.currentTime);
          gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
          osc1.connect(gain1);
          gain1.connect(ctx.destination);
          osc1.start(ctx.currentTime);
          osc1.stop(ctx.currentTime + 0.12);

          const osc2 = ctx.createOscillator();
          const gain2 = ctx.createGain();
          osc2.type = 'sine';
          osc2.frequency.setValueAtTime(680, ctx.currentTime + 0.08);
          gain2.gain.setValueAtTime(0.2, ctx.currentTime + 0.08);
          gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.28);
          osc2.connect(gain2);
          gain2.connect(ctx.destination);
          osc2.start(ctx.currentTime + 0.08);
          osc2.stop(ctx.currentTime + 0.28);
        } else if (type === 'warn') {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(440, ctx.currentTime);
          gain.gain.setValueAtTime(0.12, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start();
          osc.stop(ctx.currentTime + 0.15);
        } else {
          // Low alert tone (unknown or invalid QR)
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(240, ctx.currentTime);
          gain.gain.setValueAtTime(0.15, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start();
          osc.stop(ctx.currentTime + 0.22);
        }
      } catch {
        // Audio output muted/suppressed
      }
    },
    [soundEnabled]
  );

  // Process detected QR code token: Retrieve student and display card with 4 action buttons
  const handleProcessScan = useCallback(
    async (rawToken: string) => {
      const token = rawToken.trim();
      if (!token || isProcessingScanRef.current || savingStatus) return;

      // Prevent duplicate scan processing within 1.8 seconds for same token
      const now = Date.now();
      if (lastScannedTokenRef.current === token && now - lastScannedTimeRef.current < 1800) {
        return;
      }

      isProcessingScanRef.current = true;
      lastScannedTokenRef.current = token;
      lastScannedTimeRef.current = now;

      try {
        const student = await schoolService.getStudentByQRToken(token);

        // Check if student exists
        if (!student) {
          setScannedWarning('Unknown student QR code. No matching record in local database.');
          playChime('error');
          setActiveScannedStudent(null);
          setSavedConfirmation(null);
          return;
        }

        // Check revoked credential
        let scannedCid: string | null = null;
        if (token.startsWith('{') && token.endsWith('}')) {
          try {
            const parsed = JSON.parse(token);
            if (parsed.cid) scannedCid = parsed.cid;
          } catch {
            // ignore
          }
        }

        if (
          scannedCid &&
          Array.isArray(student.revokedCredentialIds) &&
          student.revokedCredentialIds.includes(scannedCid)
        ) {
          setScannedWarning('Card Revoked: This ID card was reported lost or damaged.');
          playChime('error');
          setActiveScannedStudent(null);
          setSavedConfirmation(null);
          return;
        }

        // Student found! Retrieve class and current attendance status for today
        const [targetClass, existingRecords] = await Promise.all([
          schoolService.getClassById(student.classId),
          schoolService.getAttendanceForClassAndDate(student.classId, currentDate),
        ]);

        const existingRecord = existingRecords.find((r) => r.studentId === student.id);
        const currentStatus = existingRecord?.status || 'pending';

        setActiveScannedStudent({
          student,
          className: targetClass ? targetClass.name : 'SchoolSync Class',
          currentStatus,
        });

        setScannedWarning(null);
        setSavedConfirmation(null);
        playChime('scan');

        // Clear previous auto-dismiss timer
        if (autoResetTimerRef.current) {
          window.clearTimeout(autoResetTimerRef.current);
          autoResetTimerRef.current = null;
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Database error';
        setScannedWarning(message);
        playChime('error');
      } finally {
        isProcessingScanRef.current = false;
      }
    },
    [currentDate, playChime, savingStatus]
  );

  // Continuous frame analysis decoding loop via jsQR
  const scanFrame = useCallback(() => {
    if (!isScanning) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
      const width = video.videoWidth;
      const height = video.videoHeight;

      if (width > 0 && height > 0) {
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });

        if (ctx) {
          ctx.drawImage(video, 0, 0, width, height);
          const imageData = ctx.getImageData(0, 0, width, height);

          // Decode QR code from raw pixels
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'dontInvert',
          });

          if (code && code.data) {
            handleProcessScan(code.data);
          }
        }
      }
    }

    if (isScanning && cameraActive) {
      animationFrameIdRef.current = requestAnimationFrame(scanFrame);
    }
  }, [isScanning, cameraActive, handleProcessScan]);

  // Handle camera errors
  const handleCameraError = useCallback((err: unknown) => {
    const errorObj = err as { name?: string; message?: string };
    const errName = errorObj.name || '';
    const inIframe = typeof window !== 'undefined' && window.self !== window.top;

    if (errName === 'NotAllowedError' || errName === 'PermissionDeniedError' || errName === 'SecurityError') {
      let hint = 'Tap the camera or lock icon in your browser address bar, set Camera to "Allow", and tap "Retry Camera Access".';
      if (inIframe) {
        hint =
          'AI Studio preview runs in an isolated iframe. If camera permission is blocked by your browser for iframes, test the app directly in a full browser tab or on an Android phone using the direct URL.';
      }
      setCameraError({
        type: 'denied',
        title: 'Camera Permission Denied',
        message: 'Camera permission was not granted by the browser or user.',
        actionHint: hint,
      });
    } else if (errName === 'NotFoundError' || errName === 'DevicesNotFoundError') {
      setCameraError({
        type: 'not_found',
        title: 'No Camera Detected',
        message: 'No physical camera hardware was found on this device.',
        actionHint: 'Please connect a USB webcam or test on an Android phone / tablet with an optical camera.',
      });
    } else if (errName === 'NotReadableError' || errName === 'TrackStartError') {
      setCameraError({
        type: 'not_readable',
        title: 'Camera Currently in Use',
        message: 'The camera is currently locked by another application or browser tab.',
        actionHint: 'Close any open video apps (such as Zoom, Google Meet, Teams, or another camera tab) and tap Retry.',
      });
    } else {
      setCameraError({
        type: 'error',
        title: 'Camera Access Error',
        message: `Camera error (${errName || 'Error'}): ${errorObj.message || 'Unable to start camera stream'}.`,
        actionHint: 'Check device camera permissions and retry.',
      });
    }

    setCameraActive(false);
  }, []);

  // Start real hardware camera stream
  const startCamera = useCallback(async () => {
    setCameraError(null);
    setIsRetrying(true);

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    // 1. Check secure context
    const isLocalhost =
      typeof window !== 'undefined' &&
      (window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1' ||
        window.location.hostname.endsWith('.localhost'));
    if (typeof window !== 'undefined' && !window.isSecureContext && !isLocalhost) {
      setCameraError({
        type: 'insecure',
        title: 'HTTPS Required for Camera',
        message: 'Camera access is restricted to secure contexts (HTTPS or localhost).',
        actionHint: 'Modern browsers block media device APIs over insecure HTTP.',
      });
      setCameraActive(false);
      setIsRetrying(false);
      return;
    }

    // 2. Check navigator.mediaDevices support
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError({
        type: 'unsupported',
        title: 'Browser Not Supported',
        message: 'Your browser environment does not support navigator.mediaDevices.getUserMedia.',
        actionHint: 'Please open this application in a modern browser such as Google Chrome or Safari.',
      });
      setCameraActive(false);
      setIsRetrying(false);
      return;
    }

    // 3. Request camera stream (prefers rear environment camera on Android)
    const constraints: MediaStreamConstraints = {
      video: {
        facingMode: { ideal: facingMode },
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
      audio: false,
    };

    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');

        await new Promise<void>((resolve) => {
          if (!videoRef.current) return resolve();
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play().then(() => resolve()).catch(() => resolve());
          };
        });
      }

      setCameraActive(true);
      setIsScanning(true);
      setCameraError(null);
    } catch (err) {
      handleCameraError(err);
    } finally {
      setIsRetrying(false);
    }
  }, [facingMode, handleCameraError]);

  // Stop camera stream
  const stopCamera = useCallback(() => {
    if (animationFrameIdRef.current) {
      cancelAnimationFrame(animationFrameIdRef.current);
      animationFrameIdRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setCameraActive(false);
  }, []);

  // Lifecycle initialization
  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, [startCamera, stopCamera]);

  // Animation frame loop
  useEffect(() => {
    if (cameraActive && isScanning) {
      animationFrameIdRef.current = requestAnimationFrame(scanFrame);
    }
    return () => {
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
    };
  }, [cameraActive, isScanning, scanFrame]);

  // Toggle Pause/Play
  const handleToggleScanning = () => {
    setIsScanning((prev) => !prev);
  };

  // Switch rear/front camera
  const handleSwitchLens = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  // ATTENDANCE BUTTON ACTIONS (Section 2: Four distinct buttons)
  const handleSelectStatus = async (status: AttendanceStatus) => {
    if (!activeScannedStudent || savingStatus) return;

    setSavingStatus(true);
    const { student } = activeScannedStudent;

    let confirmationLabel = 'Status saved ✓';
    if (status === 'present') confirmationLabel = 'Present saved ✓';
    else if (status === 'absent') confirmationLabel = 'Absent saved ✓';
    else if (status === 'approved_leave') confirmationLabel = 'Leave saved ✓';
    else if (status === 'sick_leave') confirmationLabel = 'Sick saved ✓';

    try {
      // 1. Save directly to local IndexedDB via unique studentId + date key
      await schoolService.markAttendance({
        studentId: student.id,
        classId: student.classId,
        date: currentDate,
        status,
        method: 'qr_scan',
      });

      // 2. Audio & visual confirmation
      playChime('success');
      setGreenFlash(true);
      setTimeout(() => setGreenFlash(false), 600);

      // 3. Update count
      await loadTodayCount();

      // 4. Update card status and display confirmation
      setActiveScannedStudent((prev) => (prev ? { ...prev, currentStatus: status } : null));
      setSavedConfirmation(confirmationLabel);

      // 5. Resume continuous camera scanning automatically after 1.8 seconds
      if (autoResetTimerRef.current) {
        window.clearTimeout(autoResetTimerRef.current);
      }
      autoResetTimerRef.current = window.setTimeout(() => {
        setActiveScannedStudent(null);
        setSavedConfirmation(null);
      }, 1800);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Database error';
      setScannedWarning(`Failed to save: ${msg}`);
      playChime('error');
    } finally {
      setSavingStatus(false);
    }
  };

  const handleDismissCard = () => {
    setActiveScannedStudent(null);
    setSavedConfirmation(null);
    setScannedWarning(null);
  };

  return (
    <div className="space-y-4 max-w-xl mx-auto pb-10">
      
      {/* Top Scanner Card Container */}
      <div
        className={`relative bg-black rounded-3xl overflow-hidden border-2 transition-colors duration-200 shadow-2xl flex flex-col min-h-[460px] ${
          greenFlash
            ? 'border-emerald-400 ring-4 ring-emerald-500/50'
            : activeScannedStudent
            ? 'border-emerald-500/80'
            : 'border-slate-800'
        }`}
      >
        {/* Top Floating Control Bar */}
        <div className="absolute top-0 inset-x-0 z-30 p-3.5 bg-gradient-to-b from-black/90 via-black/50 to-transparent flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/90 border border-slate-700/80 text-xs text-white font-mono shadow-sm">
              <span className={`w-2 h-2 rounded-full ${cameraActive ? (isScanning ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400') : 'bg-rose-500'}`} />
              <span className="font-bold text-[11px]">{cameraActive ? (isScanning ? 'SCANNING' : 'PAUSED') : 'OFFLINE'}</span>
            </div>

            <div className="px-2.5 py-1 rounded-full bg-emerald-950/80 border border-emerald-600/50 text-emerald-300 text-[11px] font-mono font-bold flex items-center gap-1">
              <Check className="w-3 h-3 text-emerald-400" />
              <span>Today: {todayAttendanceCount}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Audio Toggle */}
            <button
              onClick={() => setSoundEnabled((prev) => !prev)}
              className="p-2 rounded-xl bg-slate-900/90 border border-slate-800 text-slate-400 hover:text-white transition-colors"
              title={soundEnabled ? 'Mute scan sound' : 'Enable scan chime'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {cameraActive && (
              <button
                onClick={handleSwitchLens}
                className="px-2.5 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 text-slate-300 hover:text-white text-xs font-semibold transition-colors"
                title="Switch Camera Lens"
              >
                Lens
              </button>
            )}

            {/* Start / Stop Toggle */}
            {cameraActive ? (
              <button
                onClick={handleToggleScanning}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5 ${
                  isScanning
                    ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                    : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                }`}
              >
                {isScanning ? (
                  <>
                    <Pause className="w-3.5 h-3.5 fill-current" />
                    <span>Pause</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Resume</span>
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={startCamera}
                disabled={isRetrying}
                className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5 disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRetrying ? 'animate-spin' : ''}`} />
                <span>{cameraError ? 'Retry' : 'Start'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Viewfinder Target Area */}
        <div className="relative flex-1 flex flex-col items-center justify-center p-4 min-h-[260px]">
          {/* Real Video Stream Element */}
          <video
            ref={videoRef}
            className={`w-full h-full object-cover absolute inset-0 ${cameraActive ? 'block' : 'hidden'}`}
            playsInline
            muted
          />

          {/* Hidden Canvas for QR decoding */}
          <canvas ref={canvasRef} className="hidden" />

          {/* Active Aiming Reticle with Corner Markers and Laser Beam */}
          {cameraActive && isScanning && !activeScannedStudent && (
            <div className="relative z-10 w-56 h-56 border-2 border-emerald-400/80 rounded-2xl flex items-center justify-center pointer-events-none shadow-2xl">
              <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-emerald-400 rounded-tl-lg" />
              <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-emerald-400 rounded-tr-lg" />
              <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-emerald-400 rounded-bl-lg" />
              <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-emerald-400 rounded-br-lg" />

              <div className="absolute inset-x-2 h-0.5 bg-emerald-400 shadow-[0_0_12px_#10b981] animate-pulse" />

              <span className="absolute -bottom-8 text-[10px] font-mono tracking-wider text-emerald-300 font-bold bg-slate-950/90 px-3 py-1 rounded-full border border-emerald-500/40">
                POINT AT STUDENT QR CARD
              </span>
            </div>
          )}

          {/* Standby overlay when paused */}
          {cameraActive && !isScanning && (
            <div className="absolute inset-0 bg-black/60 z-10 flex flex-col items-center justify-center space-y-2">
              <Pause className="w-10 h-10 text-amber-400" />
              <p className="text-sm font-bold text-white">Scanner Paused</p>
              <p className="text-xs text-slate-300">Tap "Resume" to scan student QR</p>
            </div>
          )}

          {/* Error / Standby states when camera is not running */}
          {!cameraActive && (
            <div className="relative z-10 text-center p-6 space-y-3 max-w-sm w-full">
              {cameraError?.type === 'denied' ? (
                <div className="space-y-3 text-center">
                  <div className="w-12 h-12 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center mx-auto text-amber-400 shadow-lg">
                    <ShieldAlert className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white tracking-wide">Camera Permission Denied</h3>
                    <p className="text-xs text-slate-400 mt-1">{cameraError.message}</p>
                  </div>
                  <button
                    onClick={startCamera}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold inline-flex items-center gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Retry Camera</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-3 text-center">
                  <QrCode className="w-12 h-12 text-emerald-400 mx-auto" />
                  <h3 className="text-sm font-bold text-white">Ready to Scan</h3>
                  <p className="text-xs text-slate-400">
                    Tap "Start" to open camera and scan student cards.
                  </p>
                  <button
                    type="button"
                    onClick={startCamera}
                    className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-bold transition-all shadow-md inline-flex items-center gap-2"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Start Camera</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* WARNING BANNER FOR UNKNOWN OR REVOKED QR */}
        {scannedWarning && (
          <div className="p-3 bg-rose-950/95 border-t border-rose-600 text-rose-100 z-30 flex items-center justify-between gap-3 animate-in fade-in">
            <div className="flex items-center gap-2.5 min-w-0">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
              <div className="min-w-0">
                <span className="text-[10px] font-mono font-bold uppercase text-rose-300 block">
                  QR SCAN NOTICE
                </span>
                <p className="text-xs font-semibold truncate">{scannedWarning}</p>
              </div>
            </div>
            <button
              onClick={() => setScannedWarning(null)}
              className="text-xs font-bold text-rose-400 hover:text-white px-2 py-1"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* CONFIRMATION BANNER AFTER BUTTON PRESS */}
        {savedConfirmation && (
          <div className="p-3 bg-emerald-950/95 border-t border-emerald-500 text-emerald-200 z-30 flex items-center justify-between gap-3 animate-in fade-in">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <span className="text-sm font-extrabold text-white tracking-wide">{savedConfirmation}</span>
            </div>
            <span className="text-[10px] font-mono text-emerald-400">Continuous Scan Ready</span>
          </div>
        )}

        {/* SECTION 1 & 2: SCANNED STUDENT ID CARD WITH FOUR ATTENDANCE ACTIONS */}
        {activeScannedStudent && (
          <div className="p-4 bg-slate-950/95 border-t-2 border-emerald-500 z-30 space-y-3.5 animate-in slide-in-from-bottom-2 duration-150">
            
            {/* Student ID Card Display */}
            <div className="p-3.5 bg-slate-900 rounded-2xl border border-slate-700/80 text-white flex items-center gap-3.5 shadow-xl">
              {/* Photo / Avatar */}
              <div className="w-16 h-16 rounded-2xl bg-white border-2 border-emerald-400 overflow-hidden shrink-0 shadow-md flex items-center justify-center">
                {activeScannedStudent.student.photoUrl ? (
                  <img
                    src={activeScannedStudent.student.photoUrl}
                    alt={activeScannedStudent.student.fullName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-base font-black text-slate-800 font-mono">
                    {activeScannedStudent.student.fullName.slice(0, 2).toUpperCase()}
                  </span>
                )}
              </div>

              {/* Student Details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-mono font-black uppercase px-2 py-0.5 rounded-md bg-emerald-500 text-slate-950 tracking-wider">
                    ROLL: {activeScannedStudent.student.rollNumber}
                  </span>
                  <span className="text-[10px] font-bold text-emerald-400 truncate">
                    {activeScannedStudent.className}
                  </span>
                </div>

                <h3 className="text-base font-black text-white truncate mt-1">
                  {activeScannedStudent.student.fullName}
                </h3>

                <div className="flex items-center justify-between text-xs text-slate-300 mt-0.5">
                  <span className="truncate">Father: {activeScannedStudent.student.guardianName || '—'}</span>
                  {activeScannedStudent.currentStatus !== 'pending' && (
                    <span className="text-[10px] font-bold uppercase text-emerald-400 shrink-0">
                      Current: {activeScannedStudent.currentStatus === 'sick_leave' ? 'Sick' : activeScannedStudent.currentStatus === 'approved_leave' ? 'Leave' : activeScannedStudent.currentStatus}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* FOUR LARGE CLEARLY LABELED ATTENDANCE ACTION BUTTONS */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between px-1">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                  Select Attendance Status
                </span>
                <button
                  onClick={handleDismissCard}
                  className="text-[11px] text-slate-400 hover:text-white"
                >
                  Cancel / Next
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                {/* 1. Present */}
                <button
                  type="button"
                  disabled={savingStatus}
                  onClick={() => handleSelectStatus('present')}
                  className={`py-3.5 px-3 rounded-2xl text-xs font-black transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50 ${
                    activeScannedStudent.currentStatus === 'present'
                      ? 'bg-emerald-400 text-slate-950 ring-2 ring-white'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-slate-950'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                  <span>Present</span>
                </button>

                {/* 2. Absent */}
                <button
                  type="button"
                  disabled={savingStatus}
                  onClick={() => handleSelectStatus('absent')}
                  className={`py-3.5 px-3 rounded-2xl text-xs font-black transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50 ${
                    activeScannedStudent.currentStatus === 'absent'
                      ? 'bg-rose-500 text-white ring-2 ring-white'
                      : 'bg-rose-600 hover:bg-rose-500 text-white'
                  }`}
                >
                  <XCircle className="w-4 h-4 stroke-[2.5]" />
                  <span>Absent</span>
                </button>

                {/* 3. Leave */}
                <button
                  type="button"
                  disabled={savingStatus}
                  onClick={() => handleSelectStatus('approved_leave')}
                  className={`py-3.5 px-3 rounded-2xl text-xs font-black transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50 ${
                    activeScannedStudent.currentStatus === 'approved_leave'
                      ? 'bg-blue-400 text-slate-950 ring-2 ring-white'
                      : 'bg-blue-600 hover:bg-blue-500 text-white'
                  }`}
                >
                  <Calendar className="w-4 h-4 stroke-[2.5]" />
                  <span>Leave</span>
                </button>

                {/* 4. Sick */}
                <button
                  type="button"
                  disabled={savingStatus}
                  onClick={() => handleSelectStatus('sick_leave')}
                  className={`py-3.5 px-3 rounded-2xl text-xs font-black transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50 ${
                    activeScannedStudent.currentStatus === 'sick_leave'
                      ? 'bg-amber-400 text-slate-950 ring-2 ring-white'
                      : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                  }`}
                >
                  <AlertTriangle className="w-4 h-4 stroke-[2.5]" />
                  <span>Sick</span>
                </button>
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
};
