import React, { useState, useEffect, useRef, useCallback } from 'react';
import jsQR from 'jsqr';
import {
  QrCode,
  Camera,
  CheckCircle2,
  AlertCircle,
  Volume2,
  VolumeX,
  Play,
  Pause,
  ArrowRight,
  ClipboardCheck,
  RefreshCw,
  AlertTriangle,
  Upload,
  UserCheck,
  ShieldAlert,
  Info,
  Calendar,
  Layers,
  ExternalLink,
  Copy,
  Check
} from 'lucide-react';
import {
  ClassGrade,
  Student,
  User,
  DailyRegister,
  QRScanResult,
  School
} from '../../types';
import { schoolService } from '../../services/schoolService';
import { StatusBadge } from '../common/StatusBadge';
import { QRCodeView } from '../common/QRCodeView';

interface QRScannerScreenProps {
  currentUser: User;
  school: School | null;
  currentDate: string;
  initialClassId?: string;
  onNavigateToRegister?: (classId: string) => void;
}

export const QRScannerScreen: React.FC<QRScannerScreenProps> = ({
  currentUser,
  school,
  currentDate,
  initialClassId,
  onNavigateToRegister,
}) => {
  const [classes, setClasses] = useState<ClassGrade[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [register, setRegister] = useState<DailyRegister | null>(null);
  const [classStudents, setClassStudents] = useState<Student[]>([]);

  // Camera & Scanning States
  const [isScanning, setIsScanning] = useState(true);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<{
    type: 'denied' | 'not_found' | 'not_readable' | 'insecure' | 'unsupported' | 'error';
    title: string;
    message: string;
    actionHint?: string;
  } | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [isRetrying, setIsRetrying] = useState(false);
  const [isInIframe, setIsInIframe] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  // Success Confirmation Card (Section 6)
  const [activeConfirmation, setActiveConfirmation] = useState<QRScanResult | null>(null);
  const confirmationTimerRef = useRef<number | null>(null);

  // Debouncing duplicate detection within 2.5 seconds
  const lastScannedTokenRef = useRef<string>('');
  const lastScannedTimeRef = useRef<number>(0);
  const isProcessingScanRef = useRef<boolean>(false);

  // Video & Canvas DOM references
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameIdRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Test simulation selection
  const [selectedSimStudent, setSelectedSimStudent] = useState<string>('');

  // 1. Load accessible classes
  useEffect(() => {
    const loadClasses = async () => {
      const allClasses = await schoolService.getClasses();
      let accessible = allClasses;
      if (currentUser.role === 'teacher') {
        const teachers = await schoolService.getTeachers();
        const teacherProfile = teachers.find((t) => t.id === currentUser.teacherProfileId);
        const assignedIds = teacherProfile ? teacherProfile.assignedClassIds : [];
        accessible = allClasses.filter((c) => assignedIds.includes(c.id));
      }
      setClasses(accessible);
      const targetId = initialClassId && accessible.some((c) => c.id === initialClassId)
        ? initialClassId
        : accessible[0]?.id || '';
      setSelectedClassId(targetId);
    };
    loadClasses();
  }, [currentUser, initialClassId]);

  // 2. Load register and students when selectedClassId or currentDate changes
  const refreshClassState = useCallback(async () => {
    if (!selectedClassId) return;
    const [reg, stus] = await Promise.all([
      schoolService.getDailyRegister(selectedClassId, currentDate),
      schoolService.getStudentsByClass(selectedClassId),
    ]);
    setRegister(reg);
    const active = stus.filter((s) => s.enrollmentStatus === 'active');
    setClassStudents(active);
    if (active.length > 0 && !selectedSimStudent) {
      setSelectedSimStudent(active[0].id);
    }
  }, [selectedClassId, currentDate, selectedSimStudent]);

  useEffect(() => {
    refreshClassState();
  }, [refreshClassState]);

  // Audio tone feedback
  const playBeep = useCallback((tone: 'success' | 'warn' | 'error' = 'success') => {
    if (!soundEnabled) return;
    try {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      const freq = tone === 'success' ? 880 : tone === 'warn' ? 440 : 220;
      osc.type = tone === 'success' ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.14);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.14);
    } catch {
      // Audio suppression fallback
    }
  }, [soundEnabled]);

  // Process a detected QR code string
  const handleProcessScan = useCallback(async (rawToken: string) => {
    const token = rawToken.trim();
    if (!token || !selectedClassId || isProcessingScanRef.current) return;

    // Suppress rapid repeated detection of the exact same code within 2.5 seconds
    const now = Date.now();
    if (lastScannedTokenRef.current === token && now - lastScannedTimeRef.current < 2500) {
      return;
    }

    isProcessingScanRef.current = true;
    lastScannedTokenRef.current = token;
    lastScannedTimeRef.current = now;

    try {
      const result = await schoolService.markAttendanceViaQRScan(token, selectedClassId, currentDate);

      // Play appropriate auditory feedback
      if (result.outcome === 'success') {
        playBeep('success');
      } else if (result.outcome === 'already_present') {
        playBeep('warn');
      } else {
        playBeep('error');
      }

      // Display compact instant confirmation card
      setActiveConfirmation(result);

      // Reset auto-clear timer (3.5 seconds)
      if (confirmationTimerRef.current) {
        window.clearTimeout(confirmationTimerRef.current);
      }
      confirmationTimerRef.current = window.setTimeout(() => {
        setActiveConfirmation(null);
      }, 4000);

      // Refresh live attendance register counts
      await refreshClassState();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Database error';
      setActiveConfirmation({
        outcome: 'error',
        success: false,
        message,
        timestamp: new Date().toLocaleTimeString(),
      });
      playBeep('error');
    } finally {
      // Allow new scans to be processed immediately
      isProcessingScanRef.current = false;
    }
  }, [selectedClassId, currentDate, playBeep, refreshClassState]);

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

          // Decode QR from raw pixels
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

  // Handle and categorize camera errors with actionable user guidance
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
        actionHint: 'Please connect a USB webcam or test on a mobile phone / tablet equipped with an integrated camera.',
      });
    } else if (errName === 'NotReadableError' || errName === 'TrackStartError') {
      setCameraError({
        type: 'not_readable',
        title: 'Camera Currently in Use',
        message: 'The camera is currently locked or in use by another application or browser tab.',
        actionHint: 'Close any open video apps (such as Zoom, Google Meet, Microsoft Teams, or another camera tab) and tap Retry.',
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

  // Start real hardware camera stream with robust pre-flight checks and fallback
  const startCamera = useCallback(async () => {
    setCameraError(null);
    setIsRetrying(true);

    // Stop any existing tracks before requesting a new stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    // 1. Secure context check (browser requirement for camera access)
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
        actionHint: 'Modern browsers block camera and media device APIs over insecure HTTP.',
      });
      setCameraActive(false);
      setIsRetrying(false);
      return;
    }

    // 2. Check browser support for mediaDevices API
    if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== 'function') {
      setCameraError({
        type: 'unsupported',
        title: 'Camera API Unsupported',
        message: 'The mediaDevices.getUserMedia API is not supported in this browser.',
        actionHint: 'Please use a modern standards-compliant browser such as Google Chrome, Edge, Safari, or Firefox.',
      });
      setCameraActive(false);
      setIsRetrying(false);
      return;
    }

    // 3. Pre-flight check: camera hardware presence via enumerateDevices (if supported)
    try {
      if (typeof navigator.mediaDevices.enumerateDevices === 'function') {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter((d) => d.kind === 'videoinput');
        if (devices.length > 0 && videoDevices.length === 0) {
          setCameraError({
            type: 'not_found',
            title: 'No Camera Detected',
            message: 'No physical camera hardware was found on this system.',
            actionHint: 'Connect a USB webcam or test on a mobile device equipped with a camera.',
          });
          setCameraActive(false);
          setIsRetrying(false);
          return;
        }
      }
    } catch {
      // Proceed even if enumerateDevices is restricted
    }

    // 4. Request camera stream: prefer rear camera on Android/mobile ('environment')
    let stream: MediaStream | null = null;
    try {
      const preferredConstraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      };
      stream = await navigator.mediaDevices.getUserMedia(preferredConstraints);
    } catch (primaryErr: unknown) {
      const pErr = primaryErr as { name?: string; message?: string };
      // Fallback: If resolution or facingMode constraint fails, retry with minimal constraint
      if (pErr.name === 'OverconstrainedError' || pErr.name === 'ConstraintNotSatisfiedError') {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        } catch (fallbackErr) {
          handleCameraError(fallbackErr);
          setIsRetrying(false);
          return;
        }
      } else {
        handleCameraError(primaryErr);
        setIsRetrying(false);
        return;
      }
    }

    if (!stream) {
      setIsRetrying(false);
      return;
    }

    streamRef.current = stream;

    try {
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        videoRef.current.setAttribute('muted', 'true');
        await videoRef.current.play();
      }

      setCameraActive(true);
      setIsScanning(true);
      setCameraError(null);
    } catch (playErr: unknown) {
      console.error('Video playback failed:', playErr);
      setCameraError({
        type: 'error',
        title: 'Video Stream Error',
        message: 'Connected to camera stream, but browser could not begin video playback.',
        actionHint: 'Check if browser background tabs or autoplay settings are restricted.',
      });
      setCameraActive(false);
    } finally {
      setIsRetrying(false);
    }
  }, [facingMode, handleCameraError]);

  // Check if running inside iframe (e.g. AI Studio preview)
  useEffect(() => {
    try {
      setIsInIframe(window.self !== window.top);
    } catch {
      setIsInIframe(true);
    }
  }, []);

  const handleCopyDirectUrl = () => {
    try {
      navigator.clipboard.writeText(window.location.href);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2500);
    } catch {
      // fallback
    }
  };

  // Stop camera tracks cleanly
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

  // Initialize camera on mount, release on unmount
  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
      if (confirmationTimerRef.current) {
        window.clearTimeout(confirmationTimerRef.current);
      }
    };
  }, [startCamera, stopCamera]);

  // Restart scan loop when cameraActive or isScanning changes
  useEffect(() => {
    if (cameraActive && isScanning) {
      animationFrameIdRef.current = requestAnimationFrame(scanFrame);
    } else if (animationFrameIdRef.current) {
      cancelAnimationFrame(animationFrameIdRef.current);
      animationFrameIdRef.current = null;
    }
  }, [cameraActive, isScanning, scanFrame]);

  // Toggle Pause / Resume
  const handleTogglePause = () => {
    setIsScanning((prev) => !prev);
  };

  // Switch between front & rear cameras
  const handleSwitchFacingMode = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
  };

  // Image file drop/upload scanner (for testing photos of badges or when webcam is restricted)
  const handleScanImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imgData.data, imgData.width, imgData.height, { inversionAttempts: 'attemptBoth' });
        if (code && code.data) {
          handleProcessScan(code.data);
        } else {
          setActiveConfirmation({
            outcome: 'not_found',
            success: false,
            message: 'No readable QR code found in uploaded image.',
            timestamp: new Date().toLocaleTimeString(),
          });
        }
      }
    };
    img.src = URL.createObjectURL(file);
  };

  const currentClass = classes.find((c) => c.id === selectedClassId);
  const isFinalized = register?.status === 'finalized';
  const simStudent = classStudents.find((s) => s.id === selectedSimStudent);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      {/* Session Top Bar Controls (Section 11) */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <h1 className="text-xl font-bold tracking-tight text-slate-900">
                Live Attendance QR Scanner
              </h1>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {school?.name || 'SchoolSync'} · Timezone:{' '}
              <span className="font-mono">{school?.timezone || 'Local'}</span> · Date:{' '}
              <span className="font-mono font-semibold text-slate-800">{currentDate}</span>
            </p>
          </div>

          {/* Class Selector & Audio Controls */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-300 text-xs">
              <span className="text-slate-500 font-medium">Class:</span>
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="bg-transparent font-bold text-slate-900 focus:outline-none cursor-pointer"
              >
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} - Section {c.section}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-2 rounded-lg border text-xs flex items-center gap-1 transition-colors ${
                soundEnabled
                  ? 'bg-slate-100 text-slate-800 border-slate-300'
                  : 'bg-white text-slate-400 border-slate-200'
              }`}
              title={soundEnabled ? 'Mute scan beep' : 'Enable scan audio tone'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-700" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {onNavigateToRegister && selectedClassId && (
              <button
                onClick={() => {
                  stopCamera();
                  onNavigateToRegister(selectedClassId);
                }}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition-colors"
                title="Review full class register"
              >
                <ClipboardCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>View Register</span>
              </button>
            )}
          </div>
        </div>

        {/* Live Attendance Counters & Session Status (Section 11) */}
        {register && (
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
                Session State:
              </span>
              <StatusBadge status={register.status} size="sm" />
            </div>

            <div className="flex items-center gap-2 font-mono tabular-nums">
              <div className="px-2.5 py-1 bg-slate-100 rounded border border-slate-200 text-slate-800">
                <span className="font-sans font-medium text-slate-600 mr-1 text-[11px]">Enrolled:</span>
                <span className="font-bold">{register.totalStudents}</span>
              </div>

              <div className="px-2.5 py-1 bg-emerald-50 rounded border border-emerald-200 text-emerald-900">
                <span className="font-sans font-medium text-emerald-800 mr-1 text-[11px]">Present:</span>
                <span className="font-bold text-emerald-700">{register.presentCount}</span>
              </div>

              <div className="px-2.5 py-1 bg-amber-50 rounded border border-amber-200 text-amber-900">
                <span className="font-sans font-medium text-amber-800 mr-1 text-[11px]">Pending:</span>
                <span className="font-bold text-amber-700">{register.pendingCount}</span>
              </div>

              <div className="px-2.5 py-1 bg-rose-50 rounded border border-rose-200 text-rose-900">
                <span className="font-sans font-medium text-rose-800 mr-1 text-[11px]">Absent:</span>
                <span className="font-bold text-rose-700">{register.absentCount}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Finalized Register Warning */}
      {isFinalized && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold text-slate-900">This Daily Register is Finalized and Locked</p>
            <p className="leading-relaxed text-amber-800">
              Attendance records for this date have been certified by the Principal. To authorize adjustments or reopen check-in, request the Principal to unlock the register with an audit justification.
            </p>
          </div>
        </div>
      )}

      {/* Main Viewport Grid: Real Camera Viewfinder & Companion Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Optical Camera Viewfinder (7 cols) */}
        <div className="lg:col-span-7 bg-slate-950 text-white rounded-2xl border border-slate-800 p-5 flex flex-col justify-between shadow-2xl relative overflow-hidden min-h-[460px]">
          {/* Top Viewfinder Controls */}
          <div className="flex items-center justify-between z-10 pb-3 border-b border-slate-800/80">
            <div className="flex items-center gap-2">
              <Camera className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-semibold text-slate-200">
                {cameraActive
                  ? isScanning
                    ? 'Scanner Active'
                    : 'Scanner Paused'
                  : cameraError?.type === 'denied'
                  ? 'Camera Permission Denied'
                  : cameraError?.type === 'not_found'
                  ? 'No Camera Hardware'
                  : cameraError?.type === 'not_readable'
                  ? 'Camera In Use / Busy'
                  : cameraError?.type === 'insecure'
                  ? 'HTTPS Required'
                  : cameraError
                  ? 'Camera Error'
                  : 'Camera Ready'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {cameraActive && (
                <>
                  <button
                    onClick={handleSwitchFacingMode}
                    className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
                    title="Switch Camera (Front/Rear)"
                  >
                    Switch Lens
                  </button>

                  <button
                    onClick={handleTogglePause}
                    className={`px-3 py-1 rounded text-xs font-bold transition-colors flex items-center gap-1 ${
                      isScanning
                        ? 'bg-amber-600 hover:bg-amber-500 text-white'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                    }`}
                  >
                    {isScanning ? (
                      <>
                        <Pause className="w-3.5 h-3.5" />
                        <span>Pause</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Resume</span>
                      </>
                    )}
                  </button>
                </>
              )}

              {!cameraActive && (
                <button
                  onClick={startCamera}
                  disabled={isRetrying}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-colors shadow-sm flex items-center gap-1.5 disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRetrying ? 'animate-spin' : ''}`} />
                  <span>{cameraError ? 'Retry Camera Access' : 'Start Camera'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Viewfinder Center Target with Video and Reticle */}
          <div className="my-4 relative flex flex-col items-center justify-center min-h-[290px] bg-slate-900/80 rounded-xl overflow-hidden border border-slate-800/80">
            {/* Live Video Element */}
            <video
              ref={videoRef}
              className={`w-full h-full object-cover absolute inset-0 ${cameraActive ? 'block' : 'hidden'}`}
              playsInline
              muted
            />

            {/* Hidden canvas for jsQR pixel sampling */}
            <canvas ref={canvasRef} className="hidden" />

            {/* Target Reticle & Laser Sweep Overlay */}
            {cameraActive && isScanning && (
              <div className="relative z-10 w-56 h-56 border-2 border-emerald-400/70 rounded-xl flex items-center justify-center pointer-events-none shadow-2xl">
                {/* 4 Corner Markers */}
                <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-emerald-400 rounded-tl" />
                <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-emerald-400 rounded-tr" />
                <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-emerald-400 rounded-bl" />
                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-emerald-400 rounded-br" />

                {/* Animated Horizontal Laser Scan Beam */}
                <div className="absolute inset-x-2 h-0.5 bg-emerald-400 shadow-[0_0_12px_#34d399] animate-bounce opacity-80" />
              </div>
            )}

            {!cameraActive && (
              <div className="relative z-10 text-center p-6 space-y-3 max-w-md w-full">
                {cameraError?.type === 'denied' ? (
                  /* Dedicated Camera Permission Resolution Screen */
                  <div className="space-y-3 text-center">
                    <div className="w-12 h-12 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center mx-auto text-amber-400 shadow-lg">
                      <ShieldAlert className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white tracking-wide">
                        Camera Permission Denied
                      </h3>
                      <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                        Camera access is required for real-time QR badge scanning. Browser permission was blocked or denied.
                      </p>
                    </div>

                    {/* Step-by-Step Instructions */}
                    <div className="p-3 rounded-lg bg-slate-900 border border-slate-700/80 text-left text-xs space-y-1.5">
                      <p className="font-bold text-amber-300 flex items-center gap-1.5">
                        <Info className="w-3.5 h-3.5 text-amber-400" />
                        <span>How to enable camera access:</span>
                      </p>
                      <ol className="list-decimal list-inside space-y-1 text-slate-300 text-[11px] leading-relaxed">
                        <li>
                          Tap the <span className="font-semibold text-white">lock 🔒 or camera 📷</span> icon in your browser address bar.
                        </li>
                        <li>
                          Set Camera permission to <strong className="text-emerald-400">"Allow"</strong>.
                        </li>
                        <li>
                          Tap the <strong className="text-white">"Retry Camera Access"</strong> button below to resume scanning without reloading the page.
                        </li>
                      </ol>
                    </div>

                    {/* Retry Button without full reload */}
                    <button
                      type="button"
                      onClick={startCamera}
                      disabled={isRetrying}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-md disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isRetrying ? 'animate-spin' : ''}`} />
                      <span>{isRetrying ? 'Checking Camera...' : 'Retry Camera Access (No Reload)'}</span>
                    </button>

                    {/* Embedded Iframe / AI Studio Notice */}
                    {isInIframe && (
                      <div className="p-2.5 rounded-lg bg-slate-800/80 border border-slate-700 text-left text-[11px] text-slate-300 space-y-2">
                        <p className="leading-relaxed">
                          <strong className="text-slate-100">Testing on Android or Standalone Browser:</strong> If camera hardware is restricted by the embedded preview container, open this app directly in a full browser tab or on an Android phone:
                        </p>
                        <div className="flex flex-wrap items-center gap-2 pt-0.5">
                          <button
                            type="button"
                            onClick={() => window.open(window.location.href, '_blank')}
                            className="flex items-center gap-1 px-2.5 py-1 bg-slate-700 hover:bg-slate-600 text-white rounded text-[10px] font-semibold transition-colors"
                          >
                            <ExternalLink className="w-3 h-3 text-emerald-400" />
                            <span>Open in New Tab</span>
                          </button>
                          <button
                            type="button"
                            onClick={handleCopyDirectUrl}
                            className="flex items-center gap-1 px-2.5 py-1 bg-slate-700 hover:bg-slate-600 text-white rounded text-[10px] font-semibold transition-colors"
                          >
                            {copiedUrl ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-400" />
                                <span className="text-emerald-300">URL Copied!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3 text-slate-300" />
                                <span>Copy Direct App URL</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : cameraError?.type === 'not_found' ? (
                  /* No Camera Device Detected */
                  <div className="space-y-3 text-center">
                    <Camera className="w-12 h-12 text-slate-500 mx-auto" />
                    <div>
                      <h3 className="text-sm font-bold text-white">No Physical Camera Detected</h3>
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                        No video capture device was detected on your system. Connect a webcam or test on an Android phone / tablet with an optical camera.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={startCamera}
                      disabled={isRetrying}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1.5"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isRetrying ? 'animate-spin' : ''}`} />
                      <span>Retry Camera Detection</span>
                    </button>
                  </div>
                ) : cameraError?.type === 'not_readable' ? (
                  /* Camera in Use */
                  <div className="space-y-3 text-center">
                    <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto" />
                    <div>
                      <h3 className="text-sm font-bold text-white">Camera Hardware In Use</h3>
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                        Your camera hardware is currently locked by another application (Zoom, Google Meet, Teams, or another browser window).
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={startCamera}
                      disabled={isRetrying}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold inline-flex items-center gap-1.5"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isRetrying ? 'animate-spin' : ''}`} />
                      <span>Retry Camera Connection</span>
                    </button>
                  </div>
                ) : cameraError?.type === 'insecure' ? (
                  /* Insecure Context */
                  <div className="space-y-3 text-center">
                    <ShieldAlert className="w-12 h-12 text-rose-400 mx-auto" />
                    <div>
                      <h3 className="text-sm font-bold text-white">Secure Context (HTTPS) Required</h3>
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                        Modern web browsers require an HTTPS or localhost origin to access device camera hardware.
                      </p>
                    </div>
                  </div>
                ) : cameraError ? (
                  /* Generic Error */
                  <div className="space-y-3 text-center">
                    <AlertCircle className="w-12 h-12 text-rose-400 mx-auto" />
                    <div>
                      <h3 className="text-sm font-bold text-white">{cameraError.title}</h3>
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">{cameraError.message}</p>
                    </div>
                    <button
                      type="button"
                      onClick={startCamera}
                      disabled={isRetrying}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1.5"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isRetrying ? 'animate-spin' : ''}`} />
                      <span>Retry</span>
                    </button>
                  </div>
                ) : (
                  /* Initial Standby */
                  <div className="space-y-3 text-center">
                    <QrCode className="w-12 h-12 text-emerald-400/80 mx-auto" />
                    <div>
                      <h3 className="text-sm font-semibold text-slate-200">Camera Ready</h3>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        Tap "Start Camera" to activate your optical scanner and begin scanning student ID badges.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={startCamera}
                      className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-colors shadow-sm inline-flex items-center gap-2"
                    >
                      <Camera className="w-4 h-4" />
                      <span>Start Camera</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Standby indicator when paused */}
            {cameraActive && !isScanning && (
              <div className="absolute inset-0 bg-black/60 z-20 flex flex-col items-center justify-center space-y-2">
                <Pause className="w-8 h-8 text-amber-400" />
                <p className="text-xs font-bold text-white">Scanner Paused</p>
                <p className="text-[11px] text-slate-300">Tap "Resume" to continue taking roll call</p>
              </div>
            )}
          </div>

          {/* Instant Success Confirmation Card (Section 6) */}
          <div className="z-10 min-h-[96px] flex items-center justify-center">
            {activeConfirmation ? (
              activeConfirmation.outcome === 'success' ? (
                /* Compact Instant Success Card (Format specified in Section 6) */
                <div className="w-full bg-emerald-950/90 border-2 border-emerald-500 rounded-xl p-4 text-emerald-100 shadow-xl flex items-start justify-between gap-3 animate-in fade-in slide-in-from-bottom-2 duration-150">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-sm text-emerald-400 font-mono tracking-wide">
                        PRESENT ✓
                      </span>
                      <span className="text-[10px] text-emerald-300/70 font-mono">
                        {activeConfirmation.timestamp}
                      </span>
                    </div>

                    <p className="text-base font-bold text-white truncate">
                      {activeConfirmation.student?.fullName}
                    </p>

                    <div className="text-xs text-emerald-200 font-mono flex items-center gap-3">
                      <span>
                        Roll No:{' '}
                        <strong className="text-white">
                          {activeConfirmation.student?.rollNumber}
                        </strong>
                      </span>
                      <span>·</span>
                      <span>
                        Father:{' '}
                        <span className="text-emerald-100">
                          {activeConfirmation.student?.guardianName}
                        </span>
                      </span>
                    </div>

                    <p className="text-[11px] text-emerald-400 font-semibold pt-0.5">
                      Saved successfully to local database.
                    </p>
                  </div>

                  <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0 mt-1" />
                </div>
              ) : (
                /* Exception Card (Section 8: duplicate, mismatch, leave conflict, invalid) */
                <div
                  className={`w-full rounded-xl p-3.5 border text-xs flex items-start gap-3 shadow-lg ${
                    activeConfirmation.outcome === 'already_present'
                      ? 'bg-amber-950/90 border-amber-600 text-amber-200'
                      : activeConfirmation.outcome === 'conflict_leave'
                      ? 'bg-sky-950/90 border-sky-600 text-sky-200'
                      : 'bg-rose-950/90 border-rose-600 text-rose-200'
                  }`}
                >
                  <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold uppercase tracking-wider text-[11px]">
                        {activeConfirmation.outcome === 'already_present'
                          ? 'Already Marked Present'
                          : activeConfirmation.outcome === 'conflict_leave'
                          ? 'Leave Conflict'
                          : activeConfirmation.outcome === 'class_mismatch'
                          ? 'Class Mismatch'
                          : activeConfirmation.outcome === 'revoked_credential'
                          ? 'Card Revoked / Replaced'
                          : 'Scan Not Accepted'}
                      </span>
                      <span className="text-[10px] font-mono opacity-70">
                        {activeConfirmation.timestamp}
                      </span>
                    </div>
                    {activeConfirmation.student && (
                      <p className="font-semibold text-white truncate">
                        {activeConfirmation.student.fullName} (Roll: {activeConfirmation.student.rollNumber})
                      </p>
                    )}
                    <p className="text-[11px] opacity-90">{activeConfirmation.message}</p>
                  </div>
                </div>
              )
            ) : (
              <div className="w-full bg-slate-900/70 border border-slate-800 rounded-xl p-3 text-center text-xs text-slate-400 flex items-center justify-center gap-2 font-mono">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span>Scanner ready for next student...</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Testing & Session Tools (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Card: Instant QR Badge Simulator */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
            <div className="border-b border-slate-100 pb-2">
              <h3 className="text-sm font-bold text-slate-900">
                Interactive Student Badge Simulator
              </h3>
              <p className="text-xs text-slate-500">
                Test QR barcode recognition for learners in{' '}
                <span className="font-semibold text-slate-800">
                  {currentClass?.name} - {currentClass?.section}
                </span>
              </p>
            </div>

            <div className="space-y-2 text-xs">
              <label className="font-semibold text-slate-700 block">
                Select Class Student to Simulate Check-in:
              </label>
              <select
                value={selectedSimStudent}
                onChange={(e) => setSelectedSimStudent(e.target.value)}
                className="w-full p-2 rounded-lg border border-slate-300 bg-white font-medium text-slate-900 focus:outline-none focus:border-emerald-600"
              >
                {classStudents.map((st) => (
                  <option key={st.id} value={st.id}>
                    Roll {st.rollNumber} · {st.fullName}
                  </option>
                ))}
              </select>
            </div>

            {simStudent && (
              <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50 flex items-center gap-3">
                <QRCodeView
                  value={simStudent.qrCodeToken}
                  size={84}
                  subLabel={simStudent.rollNumber}
                />
                <div className="space-y-1 text-xs min-w-0">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block font-semibold">
                    Student ID Pass
                  </span>
                  <p className="font-bold text-slate-900 truncate">{simStudent.fullName}</p>
                  <p className="text-slate-600 font-mono text-[11px]">
                    Roll: <strong className="text-slate-900">{simStudent.rollNumber}</strong> · Guardian:{' '}
                    {simStudent.guardianName}
                  </p>
                  <button
                    onClick={() => handleProcessScan(simStudent.qrCodeToken)}
                    className="mt-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-bold transition-colors shadow-sm cursor-pointer"
                  >
                    Simulate Scan of this Pass
                  </button>
                </div>
              </div>
            )}

            {/* Test Edge Cases Trigger Strip (Section 8 Matrix) */}
            <div className="pt-2 border-t border-slate-100 space-y-1.5 text-xs">
              <span className="text-[11px] font-semibold text-slate-600 block">
                Test Exception Handlers (Section 8):
              </span>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => handleProcessScan('SCH-INVALID-UNKNOWN-999')}
                  className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] border border-slate-200 font-medium"
                >
                  Test Unknown QR
                </button>

                <button
                  type="button"
                  onClick={() => handleProcessScan('SCH-OAK-09B-0001-9999')}
                  className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] border border-slate-200 font-medium"
                >
                  Test Class Mismatch
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const revokedCid = (simStudent?.revokedCredentialIds && simStudent.revokedCredentialIds[0]) || 'crd_lost_revoked_test_01';
                    if (simStudent && (!simStudent.revokedCredentialIds || !simStudent.revokedCredentialIds.includes(revokedCid))) {
                      simStudent.revokedCredentialIds = [revokedCid];
                    }
                    handleProcessScan(
                      JSON.stringify({
                        v: 1,
                        sch: school?.id || 'sch_oakwood_2026',
                        sid: simStudent?.id || 'stu_cls_10a_0001',
                        cid: revokedCid,
                      })
                    );
                  }}
                  className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] border border-slate-200 font-medium"
                >
                  Test Revoked Card
                </button>

                <label className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] border border-slate-200 font-medium cursor-pointer inline-flex items-center gap-1">
                  <Upload className="w-3 h-3 text-slate-500" />
                  <span>Scan QR Image File</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleScanImageFile}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Card: Session Actions & Navigation */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3">
            <h3 className="text-sm font-bold text-slate-900">Session Actions</h3>
            <div className="space-y-2 text-xs">
              {onNavigateToRegister && selectedClassId && (
                <button
                  onClick={() => {
                    stopCamera();
                    onNavigateToRegister(selectedClassId);
                  }}
                  className="w-full flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:bg-slate-50 text-left font-semibold text-slate-800 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <ClipboardCheck className="w-4 h-4 text-emerald-600" />
                    <span>Review Today's Daily Register</span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400" />
                </button>
              )}

              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-slate-600 space-y-1">
                <p className="font-semibold text-slate-800">No Need to Navigate Between Scans:</p>
                <p className="leading-relaxed">
                  The camera remains active continuously. Hold each student's card into the frame. The green confirmation automatically replaces on each check-in and updates the daily register in real-time.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
