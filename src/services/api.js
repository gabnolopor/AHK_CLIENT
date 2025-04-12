const API_URL = import.meta.env.VITE_API_URL;

const handleApiError = (error) => {
    console.error('API Error:', error);
    if (error.response) {
        throw new Error(error.response.data.message || 'Server error');
    }
    throw new Error(error.message || 'Network error');
};

const endpointMap = {
    photo: 'photography',
    artwork: 'paintings',
    music: 'music',
    writing: 'writings',
    design: 'designs',
    biography: 'biography'
};

export const apiService = {

    // Digital Art
    getAllDigitalArt: async () => {
        try {
            const response = await fetch(`${API_URL}/digitalart`);
            if (!response.ok) throw new Error('Failed to fetch digital art');
            return response.json();
        } catch (error) {
            handleApiError(error);
        }
    },


    // Writings
    getAllWritings: async () => {
        try {
            const response = await fetch(`${API_URL}/writings`);
            if (!response.ok) throw new Error('Failed to fetch writings');
            return response.json();
        } catch (error) {
            handleApiError(error);
        }
    },
    getWritingById: async (id) => {
        const response = await fetch(`${API_URL}/writings/${id}`);
        return response.json();
    },

    // Paintings
    getAllPaintings: async () => {
        try {
            const response = await fetch(`${API_URL}/paintings`);
            if (!response.ok) throw new Error('Failed to fetch paintings');
            return response.json();
        } catch (error) {
            handleApiError(error);
        }
    },
    getPaintingById: async (id) => {
        const response = await fetch(`${API_URL}/paintings/${id}`);
        return response.json();
    },

    // Photography
    getAllPhotography: async () => {
        const response = await fetch(`${API_URL}/photography`);
        return response.json();
    },
    getPhotographyById: async (id) => {
        const response = await fetch(`${API_URL}/photography/${id}`);
        return response.json();
    },

    // Music
    getAllMusic: async () => {
        const response = await fetch(`${API_URL}/music`);
        return response.json();
    },
    getMusicById: async (id) => {
        const response = await fetch(`${API_URL}/music/${id}`);
        return response.json();
    },

        // Designs
        getAllDesigns: async () => {
            try {
                const response = await fetch(`${API_URL}/designs`);
                if (!response.ok) throw new Error('Failed to fetch designs');
                return response.json();
            } catch (error) {
                handleApiError(error);
            }
        },
        getDesignById: async (id) => {
            try {
                const response = await fetch(`${API_URL}/designs/${id}`);
                if (!response.ok) throw new Error('Failed to fetch design');
                return response.json();
            } catch (error) {
                handleApiError(error);
            }
        },

    // Biography
    getAllBiography: async () => {
        const response = await fetch(`${API_URL}/biography`);
        return response.json();
    },
    
     // Generic POST method with file upload
     uploadContent: async (type, formData) => {
        try {
            // Map frontend type to backend endpoint
            const endpoint = endpointMap[type] || type;
            
            const response = await fetch(`${API_URL}/${endpoint}`, {
                method: 'POST',
                body: formData // FormData handles the content-type header automatically
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error(`Error uploading ${type}:`, errorData);
                throw new Error(errorData.error || 'Upload failed');
            }
            return response.json();
        } catch (error) {
            console.error(`Error in uploadContent for ${type}:`, error);
            throw error;
        }
    },

    // Generic DELETE method
    deleteContent: async (type, id) => {
        const endpoint = endpointMap[type] || type;
        
        const response = await fetch(`${API_URL}/${endpoint}/${id}`, {
            method: 'DELETE'
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || 'Delete failed');
        }
        return response.json();
    },

    // Generic UPDATE method
    updateContent: async (type, id, formData) => {
        const endpoint = endpointMap[type] || type;
        
        const response = await fetch(`${API_URL}/${endpoint}/${id}`, {
            method: 'PUT',
            body: formData
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || 'Update failed');
        }
        return response.json();
    },

    loginAdmin: async (credentials) => {
        try {
            const response = await fetch(`${API_URL}/admin/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(credentials)
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Login failed');
            }

            const data = await response.json();
            // Store the token in localStorage
            localStorage.setItem('adminToken', data.token);
            return data;
        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    },

    verifyAdminToken: async () => {
        const token = localStorage.getItem('adminToken');
        if (!token) return false;

        try {
            const response = await fetch(`${API_URL}/admin/verify-token`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            return response.ok;
        } catch (error) {
            return false;
        }
    },

    updateBiography: async (id, data) => {
        try {
            const response = await fetch(`${API_URL}/biography`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ id, ...data })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Update failed');
            }

            return response.json();
        } catch (error) {
            console.error("Error updating biography:", error);
            throw error;
        }
    },

    changePassword: async (currentPassword, newPassword) => {
        try {
            const token = localStorage.getItem('adminToken');
            if (!token) throw new Error('Not authenticated');

            const response = await fetch(`${API_URL}/admin/change-password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ currentPassword, newPassword })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to change password');
            }

            return response.json();
        } catch (error) {
            console.error('Change password error:', error);
            throw error;
        }
    }
};
