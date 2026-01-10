import React from 'react';
import styled from 'styled-components';

const ProgressContainer = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
`;

const CircularProgress = styled.div`
    position: relative;
    width: ${props => props.size === 'small' ? '60px' : props.size === 'large' ? '120px' : '80px'};
    height: ${props => props.size === 'small' ? '60px' : props.size === 'large' ? '120px' : '80px'};
`;

const SVGCircle = styled.svg`
    transform: rotate(-90deg);
    width: 100%;
    height: 100%;
`;

const CircleBackground = styled.circle`
    fill: none;
    stroke: var(--border-color, #e5e7eb);
    stroke-width: ${props => props.size === 'small' ? '4' : props.size === 'large' ? '8' : '6'};
`;

const CircleProgress = styled.circle`
    fill: none;
    stroke: ${props => props.color};
    stroke-width: ${props => props.size === 'small' ? '4' : props.size === 'large' ? '8' : '6'};
    stroke-linecap: round;
    stroke-dasharray: ${props => props.circumference};
    stroke-dashoffset: ${props => props.offset};
    transition: stroke-dashoffset 0.5s ease, stroke 0.3s ease;
`;

const ProgressText = styled.div`
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    font-size: ${props => props.size === 'small' ? '14px' : props.size === 'large' ? '24px' : '18px'};
    font-weight: 600;
    color: ${props => props.color};
`;

const TimeRemaining = styled.div`
    font-size: ${props => props.size === 'small' ? '11px' : props.size === 'large' ? '14px' : '12px'};
    color: var(--text-secondary, #6b7280);
    text-align: center;
`;

const StatusMessage = styled.div`
    font-size: ${props => props.size === 'small' ? '12px' : props.size === 'large' ? '16px' : '14px'};
    font-weight: 500;
    color: ${props => props.color};
    text-align: center;
`;

const DelayedBadge = styled.span`
    display: inline-block;
    padding: 2px 8px;
    background: #fee2e2;
    color: #dc2626;
    border-radius: 12px;
    font-size: 11px;
    font-weight: 600;
    margin-left: 6px;
`;

const DeliveryProgressIndicator = ({
    progress = 0,
    timeRemaining = '',
    statusMessage = '',
    size = 'medium',
    isDelayed = false,
    color
}) => {
    // Calculate circle properties
    const radius = size === 'small' ? 26 : size === 'large' ? 52 : 34;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (progress / 100) * circumference;

    // Determine color if not provided
    const progressColor = color || getProgressColor(progress);

    return (
        <ProgressContainer>
            <CircularProgress size={size}>
                <SVGCircle>
                    <CircleBackground
                        cx="50%"
                        cy="50%"
                        r={radius}
                        size={size}
                    />
                    <CircleProgress
                        cx="50%"
                        cy="50%"
                        r={radius}
                        circumference={circumference}
                        offset={offset}
                        color={progressColor}
                        size={size}
                    />
                </SVGCircle>
                <ProgressText color={progressColor} size={size}>
                    {progress}%
                </ProgressText>
            </CircularProgress>

            {timeRemaining && (
                <TimeRemaining size={size}>
                    {timeRemaining}
                    {isDelayed && <DelayedBadge>DELAYED</DelayedBadge>}
                </TimeRemaining>
            )}

            {statusMessage && (
                <StatusMessage color={progressColor} size={size}>
                    {statusMessage}
                </StatusMessage>
            )}
        </ProgressContainer>
    );
};

// Helper function to get color based on progress
function getProgressColor(progress) {
    if (progress < 25) {
        return '#3b82f6'; // Blue
    } else if (progress < 50) {
        return '#06b6d4'; // Cyan
    } else if (progress < 75) {
        return '#f59e0b'; // Orange
    } else if (progress < 95) {
        return '#10b981'; // Green
    } else {
        return '#eab308'; // Gold
    }
}

export default DeliveryProgressIndicator;
