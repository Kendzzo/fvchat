import { useState, useEffect, useCallback } from 'react';
import { useFriendships } from '@/hooks/useFriendships';
import { FriendRequestButton } from '@/components/FriendRequestButton';
import { Input } from '@/components/ui/input';
import { Search, Users } from 'lucide-react';
import type { Json } from '@/integrations/supabase/types';

interface SearchResult {
  id: string;
  nick: string;
  avatar_data: Json;
  age_group: string;
}

export function UserSearch() {
  const { searchUsers } = useFriendships();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const doSearch = useCallback(async (q: string) => {
    if (q.length >= 2) {
      setIsSearching(true);
      const users = await searchUsers(q);
      setResults(users as SearchResult[]);
      setIsSearching(false);
    } else {
      setResults([]);
    }
  }, [searchUsers]);

  useEffect(() => {
    const timer = setTimeout(() => doSearch(query), 300);
    return () => clearTimeout(timer);
  }, [query, searchUsers]);

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Buscar usuarios por nick..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {query.length > 0 && query.length < 2 && (
        <p className="text-sm text-muted-foreground text-center">
          Escribe al menos 2 caracteres
        </p>
      )}

      {isSearching && (
        <p className="text-sm text-muted-foreground text-center">
          Buscando...
        </p>
      )}

      {!isSearching && query.length >= 2 && results.length === 0 && (
        <div className="text-center py-6">
          <Users className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            No se encontraron usuarios
          </p>
        </div>
      )}

      {results.length > 0 && (
        <div className="space-y-2">
          {results.map((user) => (
            <div
              key={user.id}
              className="flex items-center justify-between p-3 rounded-xl bg-card border border-border"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-primary to-secondary p-0.5">
                  <div className="w-full h-full rounded-full bg-card flex items-center justify-center text-lg">
                    {(user.avatar_data as any)?.emoji || "👤"}
                  </div>
                </div>
                <div>
                  <p className="font-semibold text-sm">@{user.nick}</p>
                  <p className="text-xs text-muted-foreground">{user.age_group} años</p>
                </div>
              </div>
              <FriendRequestButton targetUserId={user.id} targetNick={user.nick} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
