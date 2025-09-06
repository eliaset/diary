import { useEffect, useState } from 'react';
import './App.css';

function formatDate(dateString) {
  const options = { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  };
  return new Date(dateString).toLocaleDateString('en-US', options);
}

export default function App() {
  const [entries, setEntries] = useState([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newEntry, setNewEntry] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchEntries = async () => {
    try {
      const response = await fetch('/api/entries');
      if (!response.ok) throw new Error('Failed to fetch entries');
      const data = await response.json();
      setEntries(data);
    } catch (err) {
      setError('Failed to load diary entries');
      console.error('Error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEntries();
  }, []);

  const handleAddEntry = async (e) => {
    e.preventDefault();
    if (!newEntry.trim()) return;

    try {
      const response = await fetch('/api/entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newEntry })
      });

      if (!response.ok) throw new Error('Failed to save entry');
      
      const savedEntry = await response.json();
      setEntries([savedEntry, ...entries]);
      setNewEntry('');
      setIsAdding(false);
    } catch (err) {
      setError('Failed to save entry');
      console.error('Error:', err);
    }
  };

  const handleDeleteEntry = async (id) => {
    if (!window.confirm('Are you sure you want to delete this entry?')) return;
    
    try {
      const response = await fetch(`/api/entries/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete entry');
      setEntries(entries.filter(entry => entry.id !== id));
    } catch (err) {
      setError('Failed to delete entry');
      console.error('Error:', err);
    }
  };

  if (isLoading) {
    return <div className="loading">Loading diary entries...</div>;
  }

  return (
    <div className="diary-app">
      <header>
        <h1>My Diary</h1>
        {!isAdding && (
          <button onClick={() => setIsAdding(true)} className="add-button">
            + New Entry
          </button>
        )}
      </header>

      {error && <div className="error">{error}</div>}

      {isAdding && (
        <form onSubmit={handleAddEntry} className="entry-form">
          <textarea
            value={newEntry}
            onChange={(e) => setNewEntry(e.target.value)}
            placeholder="Write your thoughts here..."
            autoFocus
            required
          />
          <div className="form-actions">
            <button type="submit" className="save-button">Save</button>
            <button 
              type="button" 
              onClick={() => {
                setIsAdding(false);
                setNewEntry('');
              }}
              className="cancel-button"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="entries-list">
        {entries.length === 0 ? (
          <p className="no-entries">No entries yet. Click 'New Entry' to get started!</p>
        ) : (
          entries.map(entry => (
            <div key={entry.id} className="entry">
              <div className="entry-header">
                <span className="entry-date">{formatDate(entry.created_at)}</span>
                <button 
                  onClick={() => handleDeleteEntry(entry.id)}
                  className="delete-button"
                  aria-label="Delete entry"
                >
                  ×
                </button>
              </div>
              <div className="entry-content">
                {entry.content.split('\n').map((paragraph, i) => (
                  <p key={i}>{paragraph || <br />}</p>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
