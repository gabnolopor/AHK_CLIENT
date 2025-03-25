import React, { useState, useEffect, useRef } from 'react';
import { IoIosArrowBack, IoIosArrowForward, IoIosPlay, IoIosPause } from 'react-icons/io';
import '../styles/music.css';
import { Link } from 'react-router-dom';
import { apiService } from '../services/api';
import { useApi } from '../hooks/useApi';


const Music = () => {
    const [genres, setGenres] = useState([
        'Electro',
        'Pop-rock',
        'Film-TV',
        'Experimental'
    ]);
    const [currentGenreIndex, setCurrentGenreIndex] = useState(0);
    const [songs, setSongs] = useState([]);
    const [currentSong, setCurrentSong] = useState(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const audioRef = useRef(null);
    const { loading, error, handleRequest } = useApi();

    const genreColors = {
        'Electro': '#8B4513',          // Marrón
        'Pop-rock': '#B8860B',         // Dorado
        'Film-TV': '#8B4513',          // Marrón
        'Experimental': '#B8860B',     // Dorado
    };

    const getCurrentColor = () => {
        const currentGenre = genres[currentGenreIndex];
        return genreColors[currentGenre] || '#ff0000';  // Rojo por defecto
    };

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
                setSongs(allSongs);
            } catch (error) {
                console.error('Failed to fetch songs:', error);
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

    useEffect(() => {
        if (currentSong) {
            audioRef.current.src = `https://res.cloudinary.com/andrewking/video/upload/f_mp3/${currentSong.filename}.mp4`;
            audioRef.current.play();
        }
    }, [currentSong]);

    return (
        <div className="music">
            <img 
                src="/newjukebox.png" 
                alt="Jukebox" 
                className="music__jukebox"
            />
            <div className="music__nav-container">
                <button 
                    onClick={prevGenre} 
                    className="music__nav-button"
                    style={{ borderColor: getCurrentColor(), color: getCurrentColor() }}
                    disabled={genres.length <= 1}
                >
                    <IoIosArrowBack size={24} />
                </button>
                
                <h2 className="music__genre" style={{ color: '#FFFFFF' }}>
                    {currentGenre}
                </h2>
                
                <button 
                    onClick={nextGenre} 
                    className="music__nav-button"
                    style={{ borderColor: getCurrentColor(), color: getCurrentColor() }}
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
                            <div className="music__line" style={{ backgroundColor: getCurrentColor() }}>
                                <div className="music__white-space" style={{ borderColor: getCurrentColor() }}>
                                    <p className="music__song-title" style={{ color: getCurrentColor() }}>{song.name}</p>
                                </div>
                            </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                            <button onClick={() => handlePlayPause(song)} style={{ backgroundColor: getCurrentColor(), color: '#FFFFFF', border: 'none', padding: '8px 15px', cursor: 'pointer', borderRadius: '10%', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                                {isPlaying && currentSong && currentSong._id === song._id ? <IoIosPause size={24} /> : <IoIosPlay size={24} />}
                            </button>
                        </div>
                    </div>
                ))}
            </div>
            <audio ref={audioRef} controls style={{ display: 'none' }} />
            <Link to="/boxselect"><img src="/black-logo.png" className="logo" alt="logo" /></Link>
        </div>
    );
};

export default Music;