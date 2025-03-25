import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../styles/bio.css';
import { Link } from 'react-router-dom';

const Biography = () => {
    const [biography, setBiography] = useState({ title: '', text: '' });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchBiography = async () => {
            try {
                const response = await axios.get('http://localhost:3000/api/biography');
                const cleanText = response.data.text.replace(/\\n/g, '\n');
                setBiography({ 
                    title: response.data.title,
                    text: cleanText
                });
                setLoading(false);
            } catch (error) {
                console.error('Error fetching biography:', error);
                setError('Error loading biography');
                setLoading(false);
            }
        };

        fetchBiography();
    }, []);

    if (loading) return <div>Loading...</div>;
    if (error) return <div>{error}</div>;

    return (
        <div className="bio__container">
            <div className="bio__frame">
                <img src="/bio-frame.png" alt="frame" />
            </div>
            <div className="bio__content">
                <h1>{biography.title}</h1>
                {biography.text.split('\n').map((paragraph, index) => (
                    paragraph.trim() && <p key={index}>{paragraph}</p>
                ))}
            </div>
            <Link to="/boxselect">
                <img src="/black-logo.png" className="logo" alt="logo" />
            </Link>
        </div>
    );
};

export default Biography;   
