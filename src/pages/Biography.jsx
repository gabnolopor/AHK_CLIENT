import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import { useApi } from '../hooks/useApi';
import '../styles/bio.css';
import { Link } from 'react-router-dom';

const Biography = () => {
    const [biography, setBiography] = useState({ title: '', text: '' });
    const { loading, error, handleRequest } = useApi();

    useEffect(() => {
        const fetchBiography = async () => {
            try {
                const response = await handleRequest(apiService.getAllBiography);
                
                // If the response is an array, take the first item
                const bioData = Array.isArray(response) ? response[0] : response;
                
                // Clean the text by replacing escaped newlines
                const cleanText = bioData.text.replace(/\\n/g, '\n');
                
                setBiography({ 
                    title: bioData.title,
                    text: cleanText
                });
            } catch (error) {
                console.error('Error fetching biography:', error);
            }
        };

        fetchBiography();
    }, [handleRequest]);

    if (loading) return <div>Loading...</div>;
    if (error) return <div>Error loading biography: {error}</div>;

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
