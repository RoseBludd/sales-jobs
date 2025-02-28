"""
Timing utilities for performance monitoring.

This module provides functions and classes to measure and log execution times 
of various operations during the sync process.
"""

import time
import json
import os
from datetime import datetime
from typing import Dict, List, Any, Optional
from contextlib import contextmanager

# Create a logs directory if it doesn't exist
LOGS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'logs')
os.makedirs(LOGS_DIR, exist_ok=True)

class TimingStats:
    """Class to track timing statistics of operations."""
    
    def __init__(self, process_name: str):
        """Initialize timing stats for a process.
        
        Args:
            process_name: Name of the process being timed
        """
        self.process_name = process_name
        self.start_time = time.time()
        self.operation_times = {}
        self.current_operations = {}
        
    def start_operation(self, operation_name: str) -> float:
        """Start timing an operation.
        
        Args:
            operation_name: Name of the operation to time
            
        Returns:
            float: The start time
        """
        start_time = time.time()
        self.current_operations[operation_name] = start_time
        return start_time
    
    def end_operation(self, operation_name: str) -> float:
        """End timing an operation and record its duration.
        
        Args:
            operation_name: Name of the operation to end timing
            
        Returns:
            float: The duration of the operation in seconds
        """
        if operation_name not in self.current_operations:
            raise ValueError(f"Operation '{operation_name}' was not started")
        
        start_time = self.current_operations.pop(operation_name)
        duration = time.time() - start_time
        
        if operation_name not in self.operation_times:
            self.operation_times[operation_name] = []
        
        self.operation_times[operation_name].append(duration)
        return duration
    
    def get_operation_stats(self, operation_name: str) -> Dict[str, float]:
        """Get statistics for a specific operation.
        
        Args:
            operation_name: Name of the operation
            
        Returns:
            Dict[str, float]: Statistics including count, total, average, min, max
        """
        if operation_name not in self.operation_times:
            return {"count": 0, "total": 0, "average": 0, "min": 0, "max": 0}
        
        times = self.operation_times[operation_name]
        return {
            "count": len(times),
            "total": sum(times),
            "average": sum(times) / len(times),
            "min": min(times),
            "max": max(times)
        }
    
    def get_summary(self) -> Dict[str, Any]:
        """Get a summary of all operations.
        
        Returns:
            Dict[str, Any]: Summary of all operations and their statistics
        """
        operations = {}
        for op_name in self.operation_times:
            operations[op_name] = self.get_operation_stats(op_name)
        
        return {
            "process_name": self.process_name,
            "total_duration": time.time() - self.start_time,
            "operations": operations
        }
    
    def save_to_file(self) -> str:
        """Save timing stats to a file.
        
        Returns:
            str: The filename where stats were saved
        """
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f"timing_{self.process_name}_{timestamp}.json"
        filepath = os.path.join(LOGS_DIR, filename)
        
        summary = self.get_summary()
        
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(summary, f, indent=2)
        
        return filename


@contextmanager
def timed_operation(stats: TimingStats, operation_name: str):
    """Context manager for timing an operation.
    
    Args:
        stats: The TimingStats instance
        operation_name: Name of the operation
    """
    stats.start_operation(operation_name)
    try:
        yield
    finally:
        duration = stats.end_operation(operation_name)
        print(f"⏱️ {operation_name} took {duration:.2f} seconds")
