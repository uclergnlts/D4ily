import React from 'react';
import { View } from 'react-native';
import { Comment } from '../../types';
import { CommentCard } from './CommentCard';

interface CommentThreadProps {
    comment: Comment;
    onLike?: (id: string) => void;
    onReply?: (id: string, username: string) => void;
}

export const CommentThread = React.memo(({ comment, onLike, onReply }: CommentThreadProps) => {
    return (
        <View className="mb-4">
            {/* Parent Comment */}
            <CommentCard
                comment={comment}
                onLike={onLike}
                onReply={onReply}
            />

            {/* Replies (Recursive) */}
            {comment.replies && comment.replies.length > 0 && (
                <View className="ml-6 mt-3 pl-4 border-l-2 border-zinc-100 dark:border-zinc-800/80">
                    {comment.replies.map((reply) => (
                        <CommentCard
                            key={reply.id}
                            comment={reply}
                            onLike={onLike}
                            onReply={onReply}
                            className="mb-3"
                        />
                    ))}
                </View>
            )}
        </View>
    );
});

CommentThread.displayName = 'CommentThread';
