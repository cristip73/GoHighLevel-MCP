#!/usr/bin/env python3
# /// script
# dependencies = [
#     "requests>=2.31.0",
#     "python-dateutil>=2.8.2",
#     "pytz>=2023.3",
# ]
# ///

"""
GHL Message Date Filter Script
Fetches messages from GoHighLevel API with client-side date filtering.
Since the API doesn't support date filtering, this script paginated through all messages
from newest to oldest until it reaches messages older than the start date.
"""

import json
import sys
from datetime import datetime, timezone
from typing import List, Dict, Optional, Tuple
from dateutil import parser
import requests
import pytz


class GHLMessageFetcher:
    """Fetches and filters messages from GoHighLevel API"""
    
    def __init__(self, api_key: str, location_id: str, base_url: str = "https://services.leadconnectorhq.com"):
        """
        Initialize the message fetcher
        
        Args:
            api_key: GoHighLevel API key
            location_id: Location ID for the account
            base_url: Base URL for the API
        """
        self.api_key = api_key
        self.location_id = location_id
        self.base_url = base_url
        self.headers = {
            "Authorization": f"Bearer {api_key}",
            "Version": "2021-07-28",
            "Content-Type": "application/json"
        }
    
    def fetch_conversation_messages_with_date_filter(
        self,
        conversation_id: str,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        message_types: Optional[List[str]] = None,
        limit_per_page: int = 100
    ) -> Tuple[List[Dict], Dict]:
        """
        Fetch messages from a conversation with date filtering
        
        Args:
            conversation_id: The conversation ID to fetch messages from
            start_date: Start date for filtering (inclusive)
            end_date: End date for filtering (inclusive)
            message_types: Optional list of message types to filter
            limit_per_page: Number of messages to fetch per API call
            
        Returns:
            Tuple of (filtered_messages, metadata)
        """
        all_messages = []
        filtered_messages = []
        last_message_id = None
        has_more = True
        total_fetched = 0
        pages_fetched = 0
        reached_date_limit = False
        
        # Ensure dates are timezone-aware
        if start_date and start_date.tzinfo is None:
            start_date = pytz.UTC.localize(start_date)
        if end_date and end_date.tzinfo is None:
            end_date = pytz.UTC.localize(end_date)
        
        print(f"Fetching messages for conversation: {conversation_id}")
        if start_date:
            print(f"Start date filter: {start_date.isoformat()}")
        if end_date:
            print(f"End date filter: {end_date.isoformat()}")
        
        while has_more and not reached_date_limit:
            # Fetch a page of messages
            page_messages, next_page_info = self._fetch_message_page(
                conversation_id,
                last_message_id,
                limit_per_page,
                message_types
            )
            
            if not page_messages:
                break
            
            pages_fetched += 1
            total_fetched += len(page_messages)
            
            # Process each message
            for message in page_messages:
                message_date = self._parse_message_date(message)
                
                # Check if we've gone past the start date (messages are newest first)
                if start_date and message_date < start_date:
                    reached_date_limit = True
                    break
                
                # Add to filtered list if within date range
                if self._is_within_date_range(message_date, start_date, end_date):
                    filtered_messages.append(message)
            
            # Update pagination
            has_more = next_page_info.get('nextPage', False)
            last_message_id = next_page_info.get('lastMessageId')
            
            print(f"Page {pages_fetched}: Fetched {len(page_messages)} messages, "
                  f"{len(filtered_messages)} match filters")
        
        # Sort messages by date (oldest first for readability)
        filtered_messages.sort(key=lambda m: self._parse_message_date(m))
        
        metadata = {
            'total_fetched': total_fetched,
            'total_filtered': len(filtered_messages),
            'pages_fetched': pages_fetched,
            'conversation_id': conversation_id,
            'filters_applied': {
                'start_date': start_date.isoformat() if start_date else None,
                'end_date': end_date.isoformat() if end_date else None,
                'message_types': message_types
            }
        }
        
        return filtered_messages, metadata
    
    def _fetch_message_page(
        self,
        conversation_id: str,
        last_message_id: Optional[str],
        limit: int,
        message_types: Optional[List[str]]
    ) -> Tuple[List[Dict], Dict]:
        """
        Fetch a single page of messages from the API
        
        Returns:
            Tuple of (messages, pagination_info)
        """
        url = f"{self.base_url}/conversations/{conversation_id}/messages"
        
        params = {
            'limit': limit
        }
        
        if last_message_id:
            params['lastMessageId'] = last_message_id
        
        if message_types:
            params['type'] = ','.join(message_types)
        
        try:
            response = requests.get(url, headers=self.headers, params=params)
            response.raise_for_status()
            
            data = response.json()
            messages = data.get('messages', [])
            
            pagination_info = {
                'lastMessageId': data.get('lastMessageId'),
                'nextPage': data.get('nextPage', False)
            }
            
            return messages, pagination_info
            
        except requests.exceptions.RequestException as e:
            print(f"Error fetching messages: {e}")
            return [], {}
    
    def _parse_message_date(self, message: Dict) -> datetime:
        """Parse message date and ensure it's timezone-aware"""
        date_str = message.get('dateAdded') or message.get('date')
        if not date_str:
            # Return a very old date if no date found
            return datetime.min.replace(tzinfo=pytz.UTC)
        
        try:
            dt = parser.parse(date_str)
            # Ensure timezone awareness
            if dt.tzinfo is None:
                dt = pytz.UTC.localize(dt)
            return dt
        except (ValueError, TypeError):
            return datetime.min.replace(tzinfo=pytz.UTC)
    
    def _is_within_date_range(
        self,
        message_date: datetime,
        start_date: Optional[datetime],
        end_date: Optional[datetime]
    ) -> bool:
        """Check if a message date is within the specified range"""
        if start_date and message_date < start_date:
            return False
        if end_date and message_date > end_date:
            return False
        return True
    
    def fetch_multiple_conversations_with_date_filter(
        self,
        conversation_ids: List[str],
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        message_types: Optional[List[str]] = None
    ) -> Dict[str, Tuple[List[Dict], Dict]]:
        """
        Fetch messages from multiple conversations with date filtering
        
        Returns:
            Dictionary mapping conversation_id to (messages, metadata)
        """
        results = {}
        
        for conv_id in conversation_ids:
            messages, metadata = self.fetch_conversation_messages_with_date_filter(
                conv_id,
                start_date,
                end_date,
                message_types
            )
            results[conv_id] = (messages, metadata)
        
        return results


def format_message_for_llm(message: Dict) -> str:
    """Format a message for LLM consumption"""
    msg_type = message.get('type', 'Unknown')
    direction = message.get('direction', 'Unknown')
    date = message.get('dateAdded', 'Unknown date')
    body = message.get('body', message.get('message', ''))
    
    # Handle different message types
    if msg_type == 'TYPE_CALL':
        meta = message.get('meta', {})
        duration = meta.get('callDuration', 'Unknown')
        status = meta.get('callStatus', 'Unknown')
        body = f"Call - Duration: {duration}, Status: {status}"
    elif msg_type == 'TYPE_EMAIL':
        subject = message.get('subject', 'No subject')
        body = f"Subject: {subject}\n{body}"
    
    return f"[{date}] {direction} {msg_type}: {body}"


def main():
    """Main function for CLI usage"""
    import argparse
    
    parser = argparse.ArgumentParser(description='Fetch GHL messages with date filtering')
    parser.add_argument('--api-key', required=True, help='GoHighLevel API key')
    parser.add_argument('--location-id', required=True, help='Location ID')
    parser.add_argument('--conversation-id', required=True, help='Conversation ID')
    parser.add_argument('--start-date', help='Start date (ISO format)')
    parser.add_argument('--end-date', help='End date (ISO format)')
    parser.add_argument('--message-types', nargs='+', help='Message types to filter')
    parser.add_argument('--output', choices=['json', 'llm', 'summary'], default='summary',
                       help='Output format')
    parser.add_argument('--output-file', help='Save output to file')
    
    args = parser.parse_args()
    
    # Parse dates
    start_date = parser.parse(args.start_date) if args.start_date else None
    end_date = parser.parse(args.end_date) if args.end_date else None
    
    # Create fetcher
    fetcher = GHLMessageFetcher(args.api_key, args.location_id)
    
    # Fetch messages
    messages, metadata = fetcher.fetch_conversation_messages_with_date_filter(
        args.conversation_id,
        start_date,
        end_date,
        args.message_types
    )
    
    # Format output
    if args.output == 'json':
        output = json.dumps({
            'messages': messages,
            'metadata': metadata
        }, indent=2, default=str)
    elif args.output == 'llm':
        formatted_messages = [format_message_for_llm(msg) for msg in messages]
        output = f"Conversation {args.conversation_id} - {len(messages)} messages:\n\n"
        output += "\n".join(formatted_messages)
    else:  # summary
        output = f"""
Message Fetch Summary
====================
Conversation ID: {metadata['conversation_id']}
Total Messages Fetched: {metadata['total_fetched']}
Messages After Filtering: {metadata['total_filtered']}
Pages Fetched: {metadata['pages_fetched']}

Filters Applied:
- Start Date: {metadata['filters_applied']['start_date'] or 'None'}
- End Date: {metadata['filters_applied']['end_date'] or 'None'}
- Message Types: {metadata['filters_applied']['message_types'] or 'All'}

First Message Date: {messages[0].get('dateAdded') if messages else 'N/A'}
Last Message Date: {messages[-1].get('dateAdded') if messages else 'N/A'}
"""
    
    # Output results
    if args.output_file:
        with open(args.output_file, 'w') as f:
            f.write(output)
        print(f"Output saved to {args.output_file}")
    else:
        print(output)
    
    return 0


if __name__ == "__main__":
    sys.exit(main())