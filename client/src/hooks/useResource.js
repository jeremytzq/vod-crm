import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';

export function useResource(resource) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await api.get(`/${resource}`));
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [resource]);

  useEffect(() => {
    reload();
  }, [reload]);

  const create = useCallback(
    async (data) => {
      await api.post(`/${resource}`, data);
      await reload();
    },
    [resource, reload]
  );

  const update = useCallback(
    async (id, data) => {
      await api.put(`/${resource}/${id}`, data);
      await reload();
    },
    [resource, reload]
  );

  const remove = useCallback(
    async (id) => {
      await api.del(`/${resource}/${id}`);
      await reload();
    },
    [resource, reload]
  );

  return { items, loading, error, reload, create, update, remove };
}
