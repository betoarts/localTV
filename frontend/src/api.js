import axios from 'axios';

export const API_BASE = import.meta.env.DEV 
  ? `http://${window.location.hostname}:3000` 
  : window.location.origin;
const API_URL = `${API_BASE}/api`;

export const uploadMedia = (file) => {
  const formData = new FormData();
  formData.append('file', file);
  return axios.post(`${API_URL}/media/upload`, formData);
};

export const getMedia = () => axios.get(`${API_URL}/media`).then(res => res.data);
export const deleteMedia = (id) => axios.delete(`${API_URL}/media/${id}`);

export const getPlaylists = () => axios.get(`${API_URL}/playlists`).then(res => res.data);
export const createPlaylist = (name) => axios.post(`${API_URL}/playlists`, { name }).then(res => res.data);
export const updatePlaylist = (id, name) => axios.put(`${API_URL}/playlists/${id}`, { name }).then(res => res.data);
export const deletePlaylist = (id) => axios.delete(`${API_URL}/playlists/${id}`).then(res => res.data);
export const getPlaylistItems = (id) => axios.get(`${API_URL}/playlists/${id}/items`).then(res => res.data);
export const addPlaylistItem = (playId, item) => axios.post(`${API_URL}/playlists/${playId}/items`, item).then(res => res.data);
export const removePlaylistItem = (playId, itemId) => axios.delete(`${API_URL}/playlists/${playId}/items/${itemId}`).then(res => res.data);
export const updatePlaylistItem = (playId, itemId, data) => axios.put(`${API_URL}/playlists/${playId}/items/${itemId}`, data).then(res => res.data);
export const reorderPlaylistItems = (playId, itemIds) => axios.put(`${API_URL}/playlists/${playId}/items/reorder`, { items: itemIds }).then(res => res.data);

export const getDevices = () => axios.get(`${API_URL}/devices`).then(res => res.data);
export const createDevice = (device) => axios.post(`${API_URL}/devices`, device).then(res => res.data);
export const updateDevice = (id, device) => axios.put(`${API_URL}/devices/${id}`, device).then(res => res.data);
export const getDevice = (id) => axios.get(`${API_URL}/devices/${id}`).then(res => res.data);
export const deleteDevice = (id) => axios.delete(`${API_URL}/devices/${id}`).then(res => res.data);

export const getOverlays = () => axios.get(`${API_URL}/overlays`).then(res => res.data);
export const getOverlaysByTarget = (type, id) => axios.get(`${API_URL}/overlays/target/${type}/${id}`).then(res => res.data);
export const getPlaylistItemsOverlays = (playlistId) => axios.get(`${API_URL}/overlays/playlist-items/${playlistId}`).then(res => res.data);
export const createOverlay = (data) => axios.post(`${API_URL}/overlays`, data).then(res => res.data);
export const updateOverlay = (id, data) => axios.put(`${API_URL}/overlays/${id}`, data).then(res => res.data);
export const deleteOverlay = (id) => axios.delete(`${API_URL}/overlays/${id}`).then(res => res.data);
export const uploadOverlayImage = (file) => {
  const formData = new FormData();
  formData.append('image', file);
  return axios.post(`${API_URL}/overlays/upload-image`, formData).then(res => res.data);
};

export const getTemplates = () => axios.get(`${API_URL}/templates`).then(res => res.data);
export const createTemplate = (data) => axios.post(`${API_URL}/templates`, data).then(res => res.data);
export const updateTemplate = (id, data) => axios.put(`${API_URL}/templates/${id}`, data).then(res => res.data);
export const deleteTemplate = (id) => axios.delete(`${API_URL}/templates/${id}`).then(res => res.data);

