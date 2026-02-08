import { useEffect, useState } from "react";
import { fetchFeedbackStream } from "../services/feedbackApi";

export default function useRealtimeFeedback() {
  const [feedback, setFeedback] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchFeedback = async () => {
      try {
        setLoading(true);
        const data = await fetchFeedbackStream();
        setFeedback(data);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchFeedback();
    const intervalId = setInterval(fetchFeedback, 5000); // Fetch new feedback every 5 seconds

    return () => clearInterval(intervalId); // Cleanup on unmount
  }, []);

  return { feedback, loading, error };
}