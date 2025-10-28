import { useEffect, useState } from 'react';
import axios from 'axios';
import { FaStar, FaRegStar, FaStarHalfAlt, FaHeart, FaRegHeart } from 'react-icons/fa';
import './App.css';

// Use .env or default fallback
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:9000';

function App() {
  const [q, setq] = useState('');
  const [books, setBooks] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('search');
  const [error, setError] = useState('');

  const resetWishlist = async () => {
    try {
      await axios.post(`${API_BASE_URL}/books/reset-wishlist`);
      setWishlist([]);
    } catch (error) {
      console.error('Error resetting wishlist:', error);
      setError('Failed to reset wishlist');
    }
  };

  useEffect(() => {
    resetWishlist();
  }, []);

  

  const fetchWishlist = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/books/wishlist`);
      if (Array.isArray(response.data)) {
        setWishlist(response.data);
      } else {
        console.warn('Wishlist response is not array:', response.data);
        setWishlist([]);
      }
    } catch (error) {
      console.error('Error fetching wishlist:', error);
      setError('Failed to load wishlist');
    }
  };

  const searchBooks = async (e) => {
    e.preventDefault();
    if (!q.trim()) return;

    setLoading(true);
    setError('');
    try {
      const response = await axios.get(`${API_BASE_URL}/books/list?q=${encodeURIComponent(q)}`);
      setBooks(response.data.items || []);
      setActiveTab('search');
      if (!response.data.items || response.data.items.length === 0) {
        setError('No books found. Try a different search term.');
      }
    } catch (error) {
      console.error('Error searching books:', error);
      setError('Failed to search books. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const isInWishlist = (title) => {
    return wishlist.some((item) => item.title === title);
  };

  const toggleWishlist = async (book) => {
    const title = book.volumeInfo?.title || book.title;

    if (isInWishlist(title)) {
      // 🗑 Remove from wishlist
      try {
        await axios.delete(`${API_BASE_URL}/books/wishlist/${encodeURIComponent(title)}`);
        setWishlist(wishlist.filter((item) => item.title !== title));
      } catch (error) {
        console.error('Error removing from wishlist:', error);
        setError('Failed to remove from wishlist');
      }
    } else {
      // ❤️ Add to wishlist
      const wishlistItem = {
        title: book.volumeInfo.title,
        authors: (book.volumeInfo.authors || []).join(', '),
        thumbnail:
          book.volumeInfo.imageLinks?.thumbnail ||
          book.volumeInfo.imageLinks?.smallThumbnail ||
          '',
        rating: book.volumeInfo.averageRating || 0,
        ratings_count: book.volumeInfo.ratingsCount || 0,
      };
      try {
        await axios.post(`${API_BASE_URL}/books/wishlist`, wishlistItem);
        await fetchWishlist();
      } catch (error) {
        console.error('Error adding to wishlist:', error);
        setError('Failed to add to wishlist');
      }
    }
  };

  const renderStars = (rating) => {
    const stars = [];
    const value = parseFloat(rating) || 0;
    const fullStars = Math.floor(value);
    const hasHalfStar = value % 1 >= 0.5;

    for (let i = 1; i <= 5; i++) {
      if (i <= fullStars) stars.push(<FaStar key={i} className="star filled" />);
      else if (i === fullStars + 1 && hasHalfStar)
        stars.push(<FaStarHalfAlt key={i} className="star filled" />);
      else stars.push(<FaRegStar key={i} className="star" />);
    }
    return stars;
  };

  const BookCard = ({ book, isWishlistItem = false }) => {
    let title, authors, thumbnail, rating, ratingsCount;

    if (isWishlistItem) {
      // ✅ Data directly from backend
      title = book.title;
      authors = book.authors;
      thumbnail = book.thumbnail;
      rating = book.rating;
      ratingsCount = book.ratings_count;
    } else {
      const info = book.volumeInfo || {};
      title = info.title;
      authors = (info.authors || []).join(', ');
      thumbnail = info.imageLinks?.thumbnail || info.imageLinks?.smallThumbnail;
      rating = info.averageRating;
      ratingsCount = info.ratingsCount;
    }

    const alreadyInWishlist = isInWishlist(title);
    const isAddDisabled = activeTab === 'search' && alreadyInWishlist;

    return (
      <div className="book-card">
        <div className="book-thumbnail">
          {thumbnail ? (
            <img
              src={thumbnail.replace('http://', 'https://')}
              alt={title}
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
              }}
            />
          ) : (
            <div className="no-image">📚 No Image</div>
          )}
        </div>

        <div className="book-info">
          <h3 className="book-title">{title}</h3>
          <p className="book-authors">{authors}</p>

          <div className="book-rating">
            <div className="stars">{renderStars(rating)}</div>
            <span className="rating-text">{rating ? parseFloat(rating).toFixed(1) : '0.0'}</span>
            <span className="rating-count">({ratingsCount || 0})</span>
          </div>

          <button
            className={`wishlist-btn ${alreadyInWishlist ? 'active' : ''} ${isAddDisabled ? 'disabled' : ''}`}
            onClick={() => {
              if (isAddDisabled) return;
              toggleWishlist({
                volumeInfo: {
                  title,
                  authors: authors.split(', '),
                  imageLinks: { thumbnail },
                  averageRating: rating,
                  ratingsCount,
                },
              });
            }}
          >
            {alreadyInWishlist ? (
              <>
                <FaHeart /> {activeTab === 'wishlist' ? 'Remove from Wishlist' : 'In Wishlist'}
              </>
            ) : (
              <>
                <FaRegHeart /> Add to Wishlist
              </>
            )}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="app">
      <header className="header">
        <h1>📚 Book Search App</h1>
        <p>Find your next favorite book</p>
      </header>

      <div className="container">
        {/* 🔍 Search Form */}
        <form onSubmit={searchBooks} className="search-form">
          <input
            type="text"
            placeholder="Search for books by title, author, or keyword..."
            value={q}
            onChange={(e) => setq(e.target.value)}
            className="search-input"
          />
          <button type="submit" className="search-btn" disabled={loading}>
            {loading ? '🔍 Searching...' : '🔍 Search'}
          </button>
        </form>

        {error && (
          <div className="error-message">
            ⚠️ {error} <button onClick={() => setError('')}>✕</button>
          </div>
        )}

        {/* 📑 Tabs */}
        <div className="tabs">
          <button
            className={`tab ${activeTab === 'search' ? 'active' : ''}`}
            onClick={() => setActiveTab('search')}
          >
            📖 Search Results ({books.length})
          </button>
          <button
            className={`tab ${activeTab === 'wishlist' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('wishlist');
              fetchWishlist();
            }}
          >
            ❤️ My Wishlist ({wishlist.length})
          </button>
        </div>

        {/* 📚 Books Grid */}
        <div className="books-grid">
          {activeTab === 'search' ? (
            loading ? (
              <div className="loading">
                <div className="spinner"></div>
                <p>Searching for books...</p>
              </div>
            ) : books.length > 0 ? (
              books.map((book) => (
                <BookCard key={book.id || book.volumeInfo.title} book={book} />
              ))
            ) : (
              <div className="empty-state">
                <div className="empty-icon">🔍</div>
                <h3>No Results Yet</h3>
                <p>Search for books to see results here</p>
              </div>
            )
          ) : wishlist.length > 0 ? (
            wishlist.map((book) => <BookCard key={book.id} book={book} isWishlistItem={true} />)
          ) : (
            <div className="empty-state">
              <div className="empty-icon">💝</div>
              <h3>Your Wishlist is Empty</h3>
              <p>Start adding books to your wishlist!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
