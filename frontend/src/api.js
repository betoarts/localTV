import axios from 'axios';

export const API_BASE = import.meta.env.DEV 
  ? `http://${window.location.hostname}:3000` 
  : window.location.origin;
const API_URL = `${API_BASE}/api`;

export const getClientId = () => {
  return localStorage.getItem('localtv_client') || 'default';
};

export const setClientId = (clientId) => {
  localStorage.setItem('localtv_client', clientId || 'default');
};

const api = axios.create();
api.interceptors.request.use((config) => {
  config.headers = config.headers || {};
  config.headers['x-client-id'] = getClientId();
  return config;
});

export const uploadMedia = (file) => {
  const formData = new FormData();
  formData.append('file', file);
  return api.post(`${API_URL}/media/upload`, formData);
};

export const getMedia = () => api.get(`${API_URL}/media`).then(res => res.data);
export const deleteMedia = (id) => api.delete(`${API_URL}/media/${id}`);

export const getPlaylists = () => api.get(`${API_URL}/playlists`).then(res => res.data);
export const createPlaylist = (name) => api.post(`${API_URL}/playlists`, { name }).then(res => res.data);
export const updatePlaylist = (id, name) => api.put(`${API_URL}/playlists/${id}`, { name }).then(res => res.data);
export const deletePlaylist = (id) => api.delete(`${API_URL}/playlists/${id}`).then(res => res.data);
export const getPlaylistItems = (id) => api.get(`${API_URL}/playlists/${id}/items`).then(res => res.data);
export const addPlaylistItem = (playId, item) => api.post(`${API_URL}/playlists/${playId}/items`, item).then(res => res.data);
export const removePlaylistItem = (playId, itemId) => api.delete(`${API_URL}/playlists/${playId}/items/${itemId}`).then(res => res.data);
export const updatePlaylistItem = (playId, itemId, data) => api.put(`${API_URL}/playlists/${playId}/items/${itemId}`, data).then(res => res.data);
export const reorderPlaylistItems = (playId, itemIds) => api.put(`${API_URL}/playlists/${playId}/items/reorder`, { items: itemIds }).then(res => res.data);

export const getDevices = () => api.get(`${API_URL}/devices`).then(res => res.data);
export const createDevice = (device) => api.post(`${API_URL}/devices`, device).then(res => res.data);
export const updateDevice = (id, device) => api.put(`${API_URL}/devices/${id}`, device).then(res => res.data);
export const getDevice = (id) => api.get(`${API_URL}/devices/${id}`).then(res => res.data);
export const deleteDevice = (id) => api.delete(`${API_URL}/devices/${id}`).then(res => res.data);

export const getOverlays = () => api.get(`${API_URL}/overlays`).then(res => res.data);
export const getOverlaysByTarget = (type, id) => api.get(`${API_URL}/overlays/target/${type}/${id}`).then(res => res.data);
export const getPlaylistItemsOverlays = (playlistId) => api.get(`${API_URL}/overlays/playlist-items/${playlistId}`).then(res => res.data);
export const createOverlay = (data) => api.post(`${API_URL}/overlays`, data).then(res => res.data);
export const updateOverlay = (id, data) => api.put(`${API_URL}/overlays/${id}`, data).then(res => res.data);
export const deleteOverlay = (id) => api.delete(`${API_URL}/overlays/${id}`).then(res => res.data);
export const reorderOverlays = (items) => api.put(`${API_URL}/overlays/reorder`, { items }).then(res => res.data);
export const uploadOverlayImage = (file) => {
  const formData = new FormData();
  formData.append('image', file);
  return api.post(`${API_URL}/overlays/upload-image`, formData).then(res => res.data);
};

export const getTemplates = () => api.get(`${API_URL}/templates`).then(res => res.data);
export const createTemplate = (data) => api.post(`${API_URL}/templates`, data).then(res => res.data);
export const updateTemplate = (id, data) => api.put(`${API_URL}/templates/${id}`, data).then(res => res.data);
export const deleteTemplate = (id) => api.delete(`${API_URL}/templates/${id}`).then(res => res.data);

export const getClients = () => api.get(`${API_URL}/clients`).then(res => res.data);
export const createClient = (data) => api.post(`${API_URL}/clients`, data).then(res => res.data);
export const updateClient = (id, data) => api.put(`${API_URL}/clients/${id}`, data).then(res => res.data);
export const deleteClient = (id) => api.delete(`${API_URL}/clients/${id}`).then(res => res.data);

export const getWeather = (city) => api.get(`${API_URL}/weather?city=${encodeURIComponent(city || 'Canela,RS')}`).then(res => res.data);

export const sendChatMessage = (message, provider) =>
  api.post(`${API_URL}/chat`, { message, provider }).then(res => res.data);

export const getChatStatus = () =>
  api.get(`${API_URL}/chat/status`).then(res => res.data);


