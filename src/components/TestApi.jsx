import { useEffect, useState } from 'react';
import { apiService } from '../services/api';
import { useApi } from '../hooks/useApi';
import LoadingFallback from './LoadingFallback';

function TestApi() {
    const [data, setData] = useState({
        writings: [],
        paintings: [],
        photography: [],
        music: [],
        designs: [],
        biography: [],
        digitalArt: []
    });
    const { loading, error, handleRequest } = useApi();

    useEffect(() => {
        const fetchAllData = async () => {
            console.log('VITE_API_URL:', import.meta.env.VITE_API_URL);

            try {
                const [writings, paintings, photography, music, designs, biography, digitalArt] = await Promise.all([
                    handleRequest(apiService.getAllWritings),
                    handleRequest(apiService.getAllPaintings),
                    handleRequest(apiService.getAllPhotography),
                    handleRequest(apiService.getAllMusic),
                    handleRequest(apiService.getAllDesigns),
                    handleRequest(apiService.getAllBiography),
                    handleRequest(apiService.getAllDigitalArt)
                ]);

                setData({
                    writings,
                    paintings,
                    photography,
                    music,
                    designs,
                    biography,
                    digitalArt
                });
            } catch (err) {
                console.error('Failed to fetch data:', err);
                if (err.response) {
                    console.error('Response data:', err.response.data);
                    console.error('Response status:', err.response.status);
                    console.error('Response headers:', err.response.headers);
                } else if (err.request) {
                    console.error('Request data:', err.request);
                } else {
                    console.error('Error message:', err.message);
                }
            }
        };

        fetchAllData();
    }, [handleRequest]);

    if (loading) {
        return <LoadingFallback />;
    }

    if (error) {
        return <div>Error: {error}</div>;
    }

    return (
        <div style={{ padding: '20px' }}>
            <h2>API Test Results</h2>
            
            <section>
                <h3>Writings ({data.writings.length})</h3>
                <pre>{JSON.stringify(data.writings, null, 2)}</pre>
            </section>

            <section>
                <h3>Paintings ({data.paintings.length})</h3>
                <pre>{JSON.stringify(data.paintings, null, 2)}</pre>
            </section>

            <section>
                <h3>Photography ({data.photography.length})</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '20px' }}>
                    {data.photography.map((photo) => (
                        <div key={photo._id} style={{ border: '1px solid #ccc', padding: '10px' }}>
                            <img 
                                src={photo.imageUrl} 
                                alt={photo.name}
                                style={{ width: '100%', height: 'auto' }}
                                onLoad={() => console.log('Image loaded:', photo.name)}
                                onError={(e) => {
                                    console.error('Image failed to load:', photo.name);
                                    console.error('URL:', photo.imageUrl);
                                }}
                            />
                            <p>Name: {photo.name}</p>
                            <p>Description: {photo.description}</p>
                            <p>Filename: {photo.filename}</p>
                            <p style={{ wordBreak: 'break-all' }}>URL: {photo.imageUrl}</p>
                        </div>
                    ))}
                </div>
                <pre>{JSON.stringify(data.photography, null, 2)}</pre>
            </section>

            <section>
                <h3>Music ({data.music.length})</h3>
                <pre>{JSON.stringify(data.music, null, 2)}</pre>
            </section>

            <section>
                <h3>Designs ({data.designs.length})</h3>
                <pre>{JSON.stringify(data.designs, null, 2)}</pre>
            </section>

            <section>
                <h3>Biography ({data.biography.length})</h3>
                <pre>{JSON.stringify(data.biography, null, 2)}</pre>
            </section>

            <section>
                <h3>Digital Art ({data.digitalArt.length})</h3>
                <pre>{JSON.stringify(data.digitalArt, null, 2)}</pre>
            </section>
        </div>
    );
}

export default TestApi;