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
    const audioRef = useRef(null);
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

    useEffect(() => {
        if (currentSong) {
            audioRef.current.src = `https://res.cloudinary.com/andrewking/video/upload/f_mp3/${currentSong.filename}.mp4`;
            audioRef.current.play();
        }
    }, [currentSong]);

    return (
        <div className="music">
<<<<<<< HEAD
            {loading ? (
                <LoadingFallback />
            ) : (
                <>
                    <img 
                        src="/newjukebox.png" 
                        alt="Jukebox" 
                        className="music__jukebox"
                    />
                    <div className="music__nav-container">
                        <button 
                            onClick={prevGenre} 
                            className="music__nav-button"
                            disabled={genres.length <= 1}
                        >
                            <IoIosArrowBack size={24} />
                        </button>
                        
                        <h2 className="music__genre">
                            {currentGenre}
                        </h2>
                        
                        <button 
                            onClick={nextGenre} 
                            className="music__nav-button"
                            disabled={genres.length <= 1}
                        >
                            <IoIosArrowForward size={24} />
                        </button>
                    </div>
                    <div className="music__grid">
                        {filteredSongs.map((song, index) => (
                            <div 
                                key={index} 
                                className="music__strip"
                            >
                                <div className="music__line-box">
                                    <div className="music__line">
                                        <div className="music__white-space">
                                            <p className="music__song-title">{song.name}</p>
                                        </div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px'}}>
                                    <button 
                                        onClick={() => handlePlayPause(song)} 
                                        className="music__control-button"
                                    >
                                        {isPlaying && currentSong && currentSong._id === song._id ? <IoIosPause size={24} /> : <IoIosPlay size={24} />}
                                    </button>
                                    <button 
                                        onClick={() => handleRestart(song)} 
                                        className="music__control-button"
                                    >
                                        <IoIosRefresh size={24} />
                                    </button>
                                </div>
                            </div>
                        ))}
=======
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
>>>>>>> 74d6bf2 (judith changes)
                    </div>
                </div>
            </div>
            <audio ref={audioRef} controls style={{ display: 'none' }} />
        </div>
    );
};

export default Music;
