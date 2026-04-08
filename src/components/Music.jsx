import React, { useState, useEffect, useRef, useMemo } from 'react';
import { IoIosArrowBack, IoIosArrowForward, IoIosPlay, IoIosPause, IoIosRefresh, IoMdHome, IoIosSkipBackward, IoIosSkipForward } from 'react-icons/io';
import '../styles/music.css';
import { Link } from 'react-router-dom';
import { apiService } from '../services/api';
import { useApi } from '../hooks/useApi';
import LoadingFallback from './LoadingFallback';

const Music = () => {
    const [genres, setGenres] = useState([
        'Electro',
        'Pop',
        'Rock',
        'Film-TV',
        'Experimental'
    ]);
    const [currentGenreIndex, setCurrentGenreIndex] = useState(0);
    const [songs, setSongs] = useState([]);
    const [currentSong, setCurrentSong] = useState(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const [waveformData, setWaveformData] = useState(null);
    const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
    const scrollLockRef = useRef(false);
    const touchStartYRef = useRef(0);
    const feedRef = useRef(null);
    const audioRef = useRef(null);
    const progressRef = useRef(null);
    const waveformCacheRef = useRef({});
    const { loading, error, handleRequest } = useApi();
    const [isLoading, setIsLoading] = useState(true);

    const nextGenre = () => {
        setCurrentGenreIndex((prev) => 
            prev === genres.length - 1 ? 0 : prev + 1
        );
    };

    const prevGenre = () => {
        setCurrentGenreIndex((prev) => 
            prev === 0 ? genres.length - 1 : prev - 1
        );
    };

    useEffect(() => {
        const fetchSongs = async () => {
            try {
                const allSongs = await handleRequest(apiService.getAllMusic);
                setTimeout(() => {
                    setSongs(allSongs);
                    setIsLoading(false);
                }, 2000);
            } catch (error) {
                console.error('Failed to fetch songs:', error);
                setIsLoading(false);
            }
        };

        fetchSongs();
    }, [handleRequest]);

    const currentGenre = genres[currentGenreIndex];
    const filteredSongs = songs.filter(song => song.genre === currentGenre);

    /* Sincronizar canción actual con el índice del feed al cambiar género (sin auto-play) */
    useEffect(() => {
        if (filteredSongs.length === 0) return;
        const idx = currentSong ? filteredSongs.findIndex(s => s._id === currentSong._id) : -1;
        const newIndex = idx >= 0 ? idx : 0;
        setCurrentTrackIndex(newIndex);
        if (idx < 0) {
            setCurrentSong(filteredSongs[0]);
            setIsPlaying(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentGenreIndex, filteredSongs.length]);

    const goToTrack = (index) => {
        if (index < 0 || index >= filteredSongs.length) return;
        setCurrentTrackIndex(index);
        setCurrentSong(filteredSongs[index]);
        setIsPlaying(true);
    };

    const handleNextTrack = () => goToTrack(currentTrackIndex + 1);
    const handlePrevTrack = () => goToTrack(currentTrackIndex - 1);

    const handleNextTrackRef = useRef(handleNextTrack);
    const handlePrevTrackRef = useRef(handlePrevTrack);
    handleNextTrackRef.current = handleNextTrack;
    handlePrevTrackRef.current = handlePrevTrack;

    useEffect(() => {
        const el = feedRef.current;
        if (!el) return;
        const onWheel = (e) => {
            if (filteredSongs.length <= 1) return;
            e.preventDefault();
            if (scrollLockRef.current) return;
            scrollLockRef.current = true;
            if (e.deltaY > 0) handleNextTrackRef.current();
            else handlePrevTrackRef.current();
            setTimeout(() => { scrollLockRef.current = false; }, 400);
        };
        el.addEventListener('wheel', onWheel, { passive: false });
        return () => el.removeEventListener('wheel', onWheel);
    }, [filteredSongs.length]);

    const handleTouchStart = (e) => {
        touchStartYRef.current = e.touches[0].clientY;
    };

    const handleTouchEnd = (e) => {
        if (filteredSongs.length <= 1) return;
        const endY = e.changedTouches[0].clientY;
        const diff = touchStartYRef.current - endY;
        if (Math.abs(diff) < 50) return;
        if (diff > 0) handleNextTrack();
        else handlePrevTrack();
    };

    const handlePlayPause = (song) => {
        if (currentSong && currentSong._id === song._id) {
            if (isPlaying) {
                audioRef.current.pause();
            } else {
                audioRef.current.play();
            }
            setIsPlaying(!isPlaying);
        } else {
            setCurrentSong(song);
            setIsPlaying(true);
        }
    };

    const handleRestart = (song) => {
        if (currentSong && currentSong._id === song._id) {
            audioRef.current.currentTime = 0;
            if (!isPlaying) {
                audioRef.current.play();
                setIsPlaying(true);
            }
        }
    };

    // Progress bar functions
    const formatTime = (time) => {
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    const handleProgressClick = (e) => {
        if (!progressRef.current || !audioRef.current) return;
        
        const rect = progressRef.current.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const progressWidth = rect.width;
        const clickPercent = clickX / progressWidth;
        
        audioRef.current.currentTime = clickPercent * duration;
    };

    const handleProgressDrag = (e) => {
        if (!isDragging || !progressRef.current || !audioRef.current) return;
        
        const rect = progressRef.current.getBoundingClientRect();
        const clickX = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
        const progressWidth = rect.width;
        const clickPercent = clickX / progressWidth;
        
        audioRef.current.currentTime = clickPercent * duration;
    };

    const handleMouseDown = () => {
        setIsDragging(true);
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    useEffect(() => {
        if (!currentSong) return;
        audioRef.current.src = `https://res.cloudinary.com/andrewking/video/upload/f_mp3/${currentSong.filename}.mp4`;
        if (isPlaying) audioRef.current.play();
    }, [currentSong, isPlaying]);

    /* Forma de onda real a partir del archivo de audio (Web Audio API) */
    useEffect(() => {
        if (!currentSong?.filename) {
            setWaveformData(null);
            return;
        }
        const songId = currentSong._id;
        const audioUrl = `https://res.cloudinary.com/andrewking/video/upload/f_mp3/${currentSong.filename}.mp4`;

        if (waveformCacheRef.current[songId]) {
            setWaveformData(waveformCacheRef.current[songId]);
            return;
        }

        setWaveformData(null);
        let cancelled = false;

        const decodeWaveform = async () => {
            try {
                const res = await fetch(audioUrl);
                const arrayBuffer = await res.arrayBuffer();
                const ctx = new (window.AudioContext || window.webkitAudioContext)();
                const decoded = await ctx.decodeAudioData(arrayBuffer);
                if (cancelled) {
                    ctx.close();
                    return;
                }
                const channelData = decoded.getChannelData(0);
                const barCount = 180;
                const samplesPerBar = Math.floor(channelData.length / barCount);
                const bars = [];
                for (let i = 0; i < barCount; i++) {
                    const start = i * samplesPerBar;
                    const end = Math.min(start + samplesPerBar, channelData.length);
                    let max = 0;
                    for (let j = start; j < end; j++) {
                        const abs = Math.abs(channelData[j]);
                        if (abs > max) max = abs;
                    }
                    bars.push(max);
                }
                ctx.close();
                const maxVal = Math.max(...bars) || 1;
                const normalized = bars.map((v) => Math.round(25 + (v / maxVal) * 70));
                if (!cancelled) {
                    waveformCacheRef.current[songId] = normalized;
                    setWaveformData(normalized);
                }
            } catch (err) {
                if (!cancelled) setWaveformData(null);
            }
        };

        decodeWaveform();
        return () => { cancelled = true; };
    }, [currentSong?._id, currentSong?.filename]);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const updateTime = () => {
            setCurrentTime(audio.currentTime);
        };

        const updateDuration = () => {
            setDuration(audio.duration);
        };

        const handleEnded = () => {
            setIsPlaying(false);
            setCurrentTime(0);
        };

        audio.addEventListener('timeupdate', updateTime);
        audio.addEventListener('loadedmetadata', updateDuration);
        audio.addEventListener('ended', handleEnded);

        return () => {
            audio.removeEventListener('timeupdate', updateTime);
            audio.removeEventListener('loadedmetadata', updateDuration);
            audio.removeEventListener('ended', handleEnded);
        };
    }, [currentSong]);

    useEffect(() => {
        const handleMouseMove = (e) => {
            if (isDragging) {
                handleProgressDrag(e);
            }
        };

        const handleMouseUpGlobal = () => {
            setIsDragging(false);
        };

        if (isDragging) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUpGlobal);
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUpGlobal);
        };
    }, [isDragging, duration]);

    const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

    /* Fallback: onda genérica si el audio aún no se ha decodificado */
    const waveformBarsFallback = useMemo(() => {
        return Array.from({ length: 180 }, (_, i) => 40 + Math.round(50 * (0.5 + 0.5 * Math.sin((i / 180) * Math.PI * 4))));
    }, []);

    const waveformBars = waveformData ?? waveformBarsFallback;

    return (
        <div className="music">
            <div className="music__container">
                <div className="music__header">
                    <Link to="/" className="home-button">
                        <IoMdHome />
                    </Link>
                </div>

                <div className="music__player">
                    <div className="music__metal-detail"></div>
                    <div className="music__metal-detail"></div>
                    
                    <div className="music__control-panel">
                        <div className="music__power-light green"></div>
                        <div className="music__power-light yellow"></div>
                    </div>

                    <div className="music__genre-selector">
                        <button onClick={prevGenre} className="music__nav-button">
                            <IoIosArrowBack />
                        </button>
                        <h2 className="music__genre">{currentGenre}</h2>
                        <button onClick={nextGenre} className="music__nav-button">
                            <IoIosArrowForward />
                        </button>
                    </div>

                    {/* Progress Bar */}
                    {currentSong && (
                        <div className="music__progress-container">
                            <div className="music__progress-info">
                                <span className="music__current-time">{formatTime(currentTime)}</span>
                                <span className="music__duration">{formatTime(duration)}</span>
                            </div>
                            <div 
                                className="music__progress-bar music__progress-bar--waveform"
                                ref={progressRef}
                                onClick={handleProgressClick}
                                onMouseDown={handleMouseDown}
                                onMouseUp={handleMouseUp}
                            >
                                <div className="music__progress-wave">
                                    <div className="music__progress-wave-track">
                                        <div className="music__progress-wave-bg" aria-hidden="true">
                                            {waveformBars.map((h, i) => (
                                                <span key={i} className="music__wave-bar" style={{ height: `${h}%` }} />
                                            ))}
                                        </div>
                                        <div className="music__progress-wave-fill" style={{ width: `${progressPercent}%` }}>
                                            <div
                                                className="music__progress-wave-fill-inner"
                                                style={{ width: progressPercent > 0 ? `${100 / (progressPercent / 100)}%` : '100%' }}
                                            >
                                                {waveformBars.map((h, i) => (
                                                    <span key={i} className="music__wave-bar music__wave-bar--fill" style={{ height: `${h}%` }} />
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="music__progress-handle" style={{ left: `${progressPercent}%` }} />
                            </div>
                        </div>
                    )}

                    {/* Feed vertical tipo TikTok/Reels: una card por canción, scroll = next/prev */}
                    <div 
                        ref={feedRef}
                        className="music__feed"
                        onTouchStart={handleTouchStart}
                        onTouchEnd={handleTouchEnd}
                        style={{ touchAction: 'pan-y' }}
                    >
                        <div 
                            className="music__feed-inner"
                            style={{ transform: `translateY(-${currentTrackIndex * 100}%)` }}
                        >
                            {filteredSongs.map((song, index) => (
                                <div key={song._id} className="music__feed-slide">
                                    <h3 className="music__feed-slide-title">{song.name}</h3>
                                    <div className="music__feed-controls">
                                        <button 
                                            type="button"
                                            className="music__feed-control music__feed-control--prev"
                                            onClick={handlePrevTrack}
                                            disabled={currentTrackIndex === 0}
                                            aria-label="Anterior"
                                        >
                                            <IoIosSkipBackward />
                                        </button>
                                        <button 
                                            type="button"
                                            className={`music__feed-control music__feed-control--play ${currentSong?._id === song._id && isPlaying ? 'active' : ''}`}
                                            onClick={() => handlePlayPause(song)}
                                            aria-label={isPlaying && currentSong?._id === song._id ? 'Pausar' : 'Reproducir'}
                                        >
                                            {isPlaying && currentSong?._id === song._id ? <IoIosPause /> : <IoIosPlay />}
                                        </button>
                                        <button 
                                            type="button"
                                            className="music__feed-control music__feed-control--next"
                                            onClick={handleNextTrack}
                                            disabled={currentTrackIndex === filteredSongs.length - 1}
                                            aria-label="Siguiente"
                                        >
                                            <IoIosSkipForward />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
            <audio ref={audioRef} controls style={{ display: 'none' }} />
        </div>
    );
};

export default Music;
