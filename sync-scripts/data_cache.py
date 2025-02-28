"""
Data cache for Monday.com sync utilities.

This module provides functions to save and load data from Monday.com API to local files,
allowing for offline development and testing without constantly hitting the API.
"""

import os
import json
import time
from datetime import datetime
from typing import Dict, List, Any, Optional

# Create a cache directory if it doesn't exist
CACHE_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'cache')
os.makedirs(CACHE_DIR, exist_ok=True)

def save_monday_data(board_id: str, data: List[Dict[str, Any]]) -> str:
    """
    Save Monday.com board data to a local JSON file with timestamp.
    
    Args:
        board_id: The Monday.com board ID
        data: The data to save
    
    Returns:
        str: The filename where the data was saved
    """
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    filename = f"monday_board_{board_id}_{timestamp}.json"
    filepath = os.path.join(CACHE_DIR, filename)
    
    # Create metadata to store with the data
    metadata = {
        "board_id": board_id,
        "timestamp": timestamp,
        "item_count": len(data),
        "cached_at": datetime.now().isoformat()
    }
    
    # Save the data with metadata
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump({
            "metadata": metadata,
            "data": data
        }, f, indent=2)
    
    return filename

def load_monday_data(filename: str = None, board_id: str = None) -> Optional[List[Dict[str, Any]]]:
    """
    Load Monday.com board data from a local JSON file.
    
    Args:
        filename: The specific filename to load
        board_id: If filename not provided, load the latest file for this board_id
    
    Returns:
        Optional[List[Dict[str, Any]]]: The loaded data or None if not found
    """
    if not filename and not board_id:
        raise ValueError("Either filename or board_id must be provided")
    
    # If filename not provided, find the latest file for the board_id
    if not filename:
        files = [f for f in os.listdir(CACHE_DIR) if f.startswith(f"monday_board_{board_id}_")]
        if not files:
            return None
        
        # Sort files by timestamp (newest first)
        files.sort(reverse=True)
        filename = files[0]
    
    filepath = os.path.join(CACHE_DIR, filename)
    
    # Load the data
    if os.path.exists(filepath):
        with open(filepath, 'r', encoding='utf-8') as f:
            try:
                data = json.load(f)
                return data.get("data", [])
            except json.JSONDecodeError:
                print(f"❌ Error: Could not parse JSON from {filepath}")
                return None
    else:
        return None

def list_cached_data(board_id: str = None) -> List[Dict[str, Any]]:
    """
    List all cached data files, optionally filtered by board_id.
    
    Args:
        board_id: Optional board ID to filter by
    
    Returns:
        List[Dict[str, Any]]: List of metadata for cached files
    """
    # Get all files in cache directory
    if board_id:
        files = [f for f in os.listdir(CACHE_DIR) if f.startswith(f"monday_board_{board_id}_")]
    else:
        files = [f for f in os.listdir(CACHE_DIR) if f.startswith("monday_board_")]
    
    result = []
    
    for filename in files:
        filepath = os.path.join(CACHE_DIR, filename)
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                data = json.load(f)
                metadata = data.get("metadata", {})
                metadata["filename"] = filename
                result.append(metadata)
        except:
            # If we can't read the file, just use basic info
            parts = filename.split('_')
            if len(parts) >= 4:
                board_id = parts[2]
                timestamp = parts[3].split('.')[0]
                result.append({
                    "filename": filename,
                    "board_id": board_id,
                    "timestamp": timestamp,
                    "item_count": "unknown"
                })
    
    # Sort by timestamp (newest first)
    result.sort(key=lambda x: x.get("timestamp", ""), reverse=True)
    return result
