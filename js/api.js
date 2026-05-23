/**
 * API Handler for Layan Platform
 */

const API_URL = 'https://script.google.com/macros/s/AKfycbzjOaT2Ywv0mP-OgRoEg_bb_7k1ojvh9PZhN50hCBSEuKUElICoMVfN8lEHoF6L6K8XfA/exec';

const API = {
    async get(action) {
        try {
            // Add timestamp to prevent caching
            const response = await fetch(`${API_URL}?action=${action}&t=${Date.now()}`);
            return await response.json();
        } catch (error) {
            console.error('API GET Error:', error);
            return { error: 'Failed to fetch data' };
        }
    },

    async post(action, payload) {
        try {
            const formData = new FormData();
            formData.append('action', action);
            formData.append('payload', JSON.stringify(payload));
            
            const response = await fetch(API_URL, {
                method: 'POST',
                body: formData
            });
            
            return await response.json();
            
        } catch (error) {
            console.error('API POST Error:', error);
            return { error: 'فشل في إرسال البيانات: ' + error.message };
        }
    }
};

// Mock Data for initial development if API is not set
const MOCK_DATA = {
    news: [],
    stats: {
        projects: 0,
        beneficiaries: 0,
        initiatives: 0,
        volunteers: 0
    }
};
