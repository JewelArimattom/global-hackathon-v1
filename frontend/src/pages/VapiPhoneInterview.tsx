import React, { useState, useEffect } from 'react';
import { Phone, PhoneOff, Clock, User, CheckCircle2, AlertCircle, Play } from 'lucide-react';

interface VapiPhoneInterviewProps {
  storytellerName: string;
  topic: string;
  onCallComplete: (callData: any) => void;
  onCallError: (error: string) => void;
}

interface CallStatus {
  callId?: string;
  status: 'idle' | 'starting' | 'ringing' | 'in-progress' | 'completed' | 'failed';
  duration: number;
  error?: string;
}

export default function VapiPhoneInterview({ 
  storytellerName, 
  topic, 
  onCallComplete, 
  onCallError 
}: VapiPhoneInterviewProps) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [callStatus, setCallStatus] = useState<CallStatus>({
    status: 'idle',
    duration: 0
  });
  const [isLoading, setIsLoading] = useState(false);

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (callStatus.status === 'in-progress') {
      interval = setInterval(() => {
        setCallStatus(prev => ({
          ...prev,
          duration: prev.duration + 1
        }));
      }, 1000);
    }
    
    return () => clearInterval(interval);
  }, [callStatus.status]);

  const startPhoneInterview = async () => {
    if (!phoneNumber.trim()) {
      onCallError('Please enter a valid phone number');
      return;
    }

    setIsLoading(true);
    setCallStatus({ status: 'starting', duration: 0 });

    try {
      const response = await fetch('http://localhost:5000/api/vapi/start-call', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          storytellerName,
          topic,
          phoneNumber: phoneNumber.trim()
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to start call');
      }

      const data = await response.json();
      
      setCallStatus({
        callId: data.callId,
        status: 'ringing',
        duration: 0
      });

      // Start polling for call status
      pollCallStatus(data.callId);

    } catch (error: any) {
      console.error('Failed to start call:', error);
      setCallStatus({
        status: 'failed',
        duration: 0,
        error: error.message
      });
      onCallError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const pollCallStatus = async (callId: string) => {
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`http://localhost:5000/api/vapi/call-status/${callId}`);
        const data = await response.json();

        setCallStatus(prev => ({
          ...prev,
          status: mapVapiStatus(data.status),
          duration: data.duration || prev.duration
        }));

        if (data.status === 'ended' || data.status === 'failed') {
          clearInterval(pollInterval);
          
          if (data.status === 'ended') {
            setCallStatus(prev => ({ ...prev, status: 'completed' }));
            onCallComplete({ callId, duration: data.duration });
          } else {
            setCallStatus(prev => ({ ...prev, status: 'failed', error: 'Call failed' }));
          }
        }
      } catch (error) {
        console.error('Error polling call status:', error);
        clearInterval(pollInterval);
      }
    }, 2000);
  };

  const mapVapiStatus = (vapiStatus: string): CallStatus['status'] => {
    const statusMap: { [key: string]: CallStatus['status'] } = {
      'queued': 'starting',
      'ringing': 'ringing',
      'in-progress': 'in-progress',
      'ended': 'completed',
      'failed': 'failed'
    };
    
    return statusMap[vapiStatus] || 'idle';
  };

  const endCall = async () => {
    if (!callStatus.callId) return;

    try {
      await fetch(`http://localhost:5000/api/vapi/end-call/${callStatus.callId}`, {
        method: 'POST'
      });
    } catch (error) {
      console.error('Error ending call:', error);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusColor = () => {
    switch (callStatus.status) {
      case 'starting':
      case 'ringing':
        return 'text-blue-600';
      case 'in-progress':
        return 'text-green-600';
      case 'completed':
        return 'text-green-600';
      case 'failed':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getStatusIcon = () => {
    switch (callStatus.status) {
      case 'starting':
      case 'ringing':
      case 'in-progress':
        return <Play className="w-5 h-5 animate-pulse" />;
      case 'completed':
        return <CheckCircle2 className="w-5 h-5" />;
      case 'failed':
        return <AlertCircle className="w-5 h-5" />;
      default:
        return <Phone className="w-5 h-5" />;
    }
  };

  const getStatusText = () => {
    switch (callStatus.status) {
      case 'idle':
        return 'Ready to call';
      case 'starting':
        return 'Starting call...';
      case 'ringing':
        return 'Ringing...';
      case 'in-progress':
        return `Interview in progress - ${formatDuration(callStatus.duration)}`;
      case 'completed':
        return `Interview completed - ${formatDuration(callStatus.duration)}`;
      case 'failed':
        return `Call failed - ${callStatus.error}`;
      default:
        return 'Unknown status';
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
      <div className="text-center mb-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Phone Interview</h3>
        <p className="text-gray-600">
          We'll call {storytellerName} for a professional interview about {topic}
        </p>
      </div>

      {/* Phone Number Input */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Phone Number
        </label>
        <input
          type="tel"
          placeholder="+1 (555) 123-4567"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
          disabled={callStatus.status !== 'idle'}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
        />
        <p className="text-sm text-gray-500 mt-1">
          Enter the phone number where we should call {storytellerName}
        </p>
      </div>

      {/* Call Status */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`${getStatusColor()}`}>
              {getStatusIcon()}
            </div>
            <div>
              <p className="font-medium text-gray-900">{getStatusText()}</p>
              {callStatus.callId && (
                <p className="text-sm text-gray-500">Call ID: {callStatus.callId}</p>
              )}
            </div>
          </div>
          
          {callStatus.status === 'in-progress' && (
            <div className="flex items-center gap-2 text-lg font-mono font-bold text-gray-900">
              <Clock className="w-5 h-5" />
              {formatDuration(callStatus.duration)}
            </div>
          )}
        </div>
      </div>

      {/* Call Controls */}
      <div className="flex gap-4">
        {callStatus.status === 'idle' ? (
          <button
            onClick={startPhoneInterview}
            disabled={isLoading || !phoneNumber.trim()}
            className="flex-1 bg-green-600 text-white py-4 rounded-lg hover:bg-green-700 transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Starting...
              </>
            ) : (
              <>
                <Phone className="w-5 h-5" />
                Start Phone Interview
              </>
            )}
          </button>
        ) : (
          <>
            {callStatus.status !== 'completed' && callStatus.status !== 'failed' && (
              <button
                onClick={endCall}
                className="flex-1 bg-red-600 text-white py-4 rounded-lg hover:bg-red-700 transition font-semibold flex items-center justify-center gap-2"
              >
                <PhoneOff className="w-5 h-5" />
                End Call
              </button>
            )}
            
            <button
              onClick={() => {
                setCallStatus({ status: 'idle', duration: 0 });
                setPhoneNumber('');
              }}
              className="flex-1 bg-gray-600 text-white py-4 rounded-lg hover:bg-gray-700 transition font-semibold"
            >
              New Call
            </button>
          </>
        )}
      </div>

      {/* Interview Tips */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <h4 className="font-semibold text-blue-900 mb-2">Interview Tips</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Ensure {storytellerName} is in a quiet place</li>
          <li>• The call will last 15-30 minutes</li>
          <li>• Speak naturally and take time to think</li>
          <li>• Share specific stories and memories</li>
          <li>• The AI interviewer will guide the conversation</li>
        </ul>
      </div>
    </div>
  );
}