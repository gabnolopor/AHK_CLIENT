import React, { useState, useEffect, useRef } from 'react';
import { IoIosArrowBack, IoIosArrowForward, IoIosPlay, IoIosPause, IoIosRefresh, IoMdHome } from 'react-icons/io';
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
    const audioRef = useRef(null);
    const progressRef = useRef(null);
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
        if (currentSong) {
            audioRef.current.src = `https://res.cloudinary.com/andrewking/video/upload/f_mp3/${currentSong.filename}.mp4`;
            audioRef.current.play();
        }
    }, [currentSong]);

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
                                className="music__progress-bar"
                                ref={progressRef}
                                onClick={handleProgressClick}
                                onMouseDown={handleMouseDown}
                                onMouseUp={handleMouseUp}
                            >
                                <div 
                                    className="music__progress-fill"
                                    style={{ width: `${progressPercent}%` }}
                                ></div>
                                <div 
                                    className="music__progress-handle"
                                    style={{ left: `${progressPercent}%` }}
                                ></div>
                            </div>
                        </div>
                    )}

                    <div className="music__vinyl-display">
                        <div className="music__tracks">
                            {filteredSongs.map((song, index) => (
                                <div key={index} className="music__track">
                                    <div className="music__track-info">
                                        <span className="music__track-number">{index + 1}</span>
                                        <p className="music__track-title">{song.name}</p>
                                    </div>
                                    <div className="music__track-controls">
                                        <button 
                                            onClick={() => handlePlayPause(song)} 
                                            className={`music__control-button ${currentSong?._id === song._id ? 'active' : ''}`}
                                        >
                                            {isPlaying && currentSong?._id === song._id ? 
                                                <IoIosPause /> : <IoIosPlay />}
                                        </button>
                                        <button 
                                            onClick={() => handleRestart(song)} 
                                            className="music__control-button"
                                        >
                                            <IoIosRefresh />
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
