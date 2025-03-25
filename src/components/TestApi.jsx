import { useEffect, useState } from 'react';
import { apiService } from '../services/api';
import { useApi } from '../hooks/useApi';

function TestApi() {
    const [data, setData] = useState({
        writings: [],
        paintings: [],
        photography: [],
        music: [],
        designs: [],
        biography: []
    });
    const { loading, error, handleRequest } = useApi();

    useEffect(() => {
        const fetchAllData = async () => {
            try {
                const [writings, paintings, photography, music, designs, biography] = await Promise.all([
                    handleRequest(apiService.getAllWritings),
                    handleRequest(apiService.getAllPaintings),
                    handleRequest(apiService.getAllPhotography),
                    handleRequest(apiService.getAllMusic),
                    handleRequest(apiService.getAllDesigns),
                    handleRequest(apiService.getAllBiography)
                ]);

                setData({
                    writings,
                    paintings,
                    photography,
                    music,
                    designs,
                    biography
                });
            } catch (err) {
                console.error('Failed to fetch data:', err);
            }
        };

        fetchAllData();
    }, [handleRequest]);

    if (loading) {
        return <div>Loading...</div>;
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
        </div>
    );
}

export default TestApi;