import { useState, useRef, useCallback } from 'react';
import { useFriendships } from '@/hooks/useFriendships';
import { FriendRequestButton } from '@/components/FriendRequestButton';
import { Input } from '@/components/ui/input';
import { Search, Users, Loader2 } from 'lucide-react';
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
  const [hasSearched, setHasSearched] = useState(false);
  const searchRequestId = useRef(0);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  const handleQueryChange = useCallback((newQuery: string) => {
    setQuery(newQuery);
    
    // Clear previous timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    if (newQuery.length < 2) {
      setResults([]);
      setIsSearching(false);
      setHasSearched(false);
      return;
    }

    setIsSearching(true);
    
    // Debounce search by 400ms
    debounceTimer.current = setTimeout(async () => {
      const currentRequestId = ++searchRequestId.current;
      
      try {
        const users = await searchUsers(newQuery);
        
        // Only update if this is still the latest request
        if (currentRequestId === searchRequestId.current) {
          setResults(users as SearchResult[]);
          setHasSearched(true);
          setIsSearching(false);
        }
      } catch (err) {
        if (currentRequestId === searchRequestId.current) {
          setResults([]);
          setIsSearching(false);
        }
      }
    }, 400);
  }, [searchUsers]);

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Buscar usuarios por nick..."
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          className="pl-10"
        />
        {isSearching && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-primary" />
        )}
      </div>

      {query.length > 0 && query.length < 2 && (
        <p className="text-sm text-muted-foreground text-center">
          Escribe al menos 2 caracteres
        </p>
      )}

      {!isSearching && hasSearched && results.length === 0 && (
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
